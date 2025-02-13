// Import Firebase App, Database, and Auth modules from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-database.js";
import { getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcOGXy2su-fQkHOue4jj7JdcV0iEgbBqc",
  authDomain: "the-game-93edd.firebaseapp.com",
  projectId: "the-game-93edd",
  storageBucket: "the-game-93edd.firebasestorage.app",
  messagingSenderId: "770818605932",
  appId: "1:770818605932:web:b7c81e65cd968e2f26a949",
  databaseURL: "https://the-game-93edd-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// ------------------------
// Global Variables for Multiplayer Game State
// ------------------------
let currentRoomCode = null;
let currentUserId = null; // Will be set after login
let isHost = false;
let localScore = 0;
let localCurrentQuestionIndex = 0; // Local question index
let activeQuestions = null; // Will store custom questions if selected

// ------------------------
// UI Elements for Authentication
// ------------------------
const googleLoginButton = document.getElementById("google-login");
const emailLoginBtn = document.getElementById("email-login-btn");
const emailSignupBtn = document.getElementById("email-signup-btn");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const authDiv = document.getElementById("auth");

// ------------------------
// UI Elements for Room Lobby
// ------------------------
const roomSection = document.getElementById("room-section");
const createRoomButton = document.getElementById("create-room-button");
const joinRoomButton = document.getElementById("join-room-button");
const joinRoomInput = document.getElementById("join-room-code");
const roomCodeDisplay = document.getElementById("room-code-display");
const playersList = document.getElementById("players-list");
const startGameButton = document.getElementById("start-game-button");
const playerNameInput = document.getElementById("player-name");
const customSetDropdown = document.getElementById("custom-set-dropdown");
const refreshSetsButton = document.getElementById("refresh-sets-button");
const toggleCustomSetButton = document.getElementById("toggle-custom-set-tool");

// ------------------------
// UI Elements for the Quiz Game
// ------------------------
const gameSection = document.getElementById("game-section");
const questionElement = document.getElementById("question");
const optionsElement = document.getElementById("options");
const nextButton = document.getElementById("next-button");
const scoreElement = document.getElementById("score");

// ------------------------
// UI Elements for Custom Question Set Creator
// ------------------------
const customSetSection = document.getElementById("custom-set-section");
const customSetTitleInput = document.getElementById("custom-set-title");
const customQuestionsContainer = document.getElementById("custom-questions-container");
const addQuestionButton = document.getElementById("add-question-button");
const saveQuestionSetButton = document.getElementById("save-question-set-button");

// ------------------------
// Default Quiz Questions
// ------------------------
const questions = [
  {
    question: "What is the capital of France?",
    options: ["Berlin", "Madrid", "Paris", "Rome"],
    correctAnswer: "Paris"
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars"
  },
  {
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4"
  },
  {
    question: "What is 4 * 5?",
    options: ["45", "9", "20", "-1"],
    correctAnswer: "20"
  }
];

// ------------------------
// Helper Function: Generate a random 6-digit room code
// ------------------------
const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ------------------------
// Authentication: Google Login
// ------------------------
googleLoginButton.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log("Logged in as:", result.user.email);
      currentUserId = result.user.uid;
      authDiv.style.display = "none";
      roomSection.style.display = "block";
      loadCustomSets();
    })
    .catch((error) => {
      console.error("Google Login Error:", error);
    });
});

// ------------------------
// Authentication: Email Login & Sign-Up
// ------------------------
emailLoginBtn.addEventListener("click", () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  signInWithEmailAndPassword(auth, email, password)
    .then((result) => {
      console.log("Email Login successful:", result.user.email);
      currentUserId = result.user.uid;
      authDiv.style.display = "none";
      roomSection.style.display = "block";
      loadCustomSets();
    })
    .catch((error) => {
      console.error("Email Login Error:", error);
      alert(error.message);
    });
});

emailSignupBtn.addEventListener("click", () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  createUserWithEmailAndPassword(auth, email, password)
    .then((result) => {
      console.log("Email Sign-Up successful:", result.user.email);
      currentUserId = result.user.uid;
      authDiv.style.display = "none";
      roomSection.style.display = "block";
      loadCustomSets();
    })
    .catch((error) => {
      console.error("Email Sign-Up Error:", error);
      alert(error.message);
    });
});

// ------------------------
// Room Creation and Joining Functions
// ------------------------
const createRoom = () => {
  if (!auth.currentUser) {
    alert("You must be logged in to create a room.");
    return;
  }
  currentRoomCode = generateRoomCode();
  isHost = true;
  currentUserId = auth.currentUser.uid;
  
  const chosenName = playerNameInput.value.trim() || auth.currentUser.displayName || auth.currentUser.email;
  
  set(ref(db, "rooms/" + currentRoomCode), {
    host: currentUserId,
    gameState: { status: "waiting" },
    players: {
      [currentUserId]: { name: chosenName, email: auth.currentUser.email, score: 0 }
    }
  })
    .then(() => {
      roomCodeDisplay.textContent = currentRoomCode;
      listenToRoom();
      startGameButton.style.display = "block"; // Only host sees the Start Game button
      alert("Room created with code: " + currentRoomCode);
    })
    .catch((error) => {
      alert("Error creating room: " + error.message);
    });
};

const joinRoom = () => {
  if (!auth.currentUser) {
    alert("You must be logged in to join a room.");
    return;
  }
  currentRoomCode = joinRoomInput.value.trim();
  if (!currentRoomCode) {
    alert("Please enter a room code.");
    return;
  }
  currentUserId = auth.currentUser.uid;
  const chosenName = playerNameInput.value.trim() || auth.currentUser.displayName || auth.currentUser.email;
  
  set(ref(db, "rooms/" + currentRoomCode + "/players/" + currentUserId), {
    name: chosenName,
    email: auth.currentUser.email,
    score: 0
  })
    .then(() => {
      roomCodeDisplay.textContent = currentRoomCode;
      listenToRoom();
      alert("Joined room: " + currentRoomCode);
    })
    .catch((error) => {
      alert("Error joining room: " + error.message);
    });
};

// ------------------------
// Listen for changes in the room data
// ------------------------
const listenToRoom = () => {
  const roomRef = ref(db, "rooms/" + currentRoomCode);
  onValue(roomRef, (snapshot) => {
    const roomData = snapshot.val();
    if (roomData) {
      // Update players list
      playersList.innerHTML = "";
      for (let playerKey in roomData.players) {
        const li = document.createElement("li");
        li.textContent = roomData.players[playerKey].name + " - Score: " + roomData.players[playerKey].score;
        playersList.appendChild(li);
      }
      // If game has started, show game section
      if (roomData.gameState && roomData.gameState.status === "started") {
        activeQuestions = roomData.gameState.customQuestions || null;
        loadQuestion();
        gameSection.style.display = "block";
        roomSection.style.display = "none";
      }
    }
  });
};

// ------------------------
// Host starts the game by updating the room’s game state.
// If a custom set is selected, load it.
const startGame = () => {
  if (!isHost) return;
  const selectedSet = customSetDropdown.value;
  if (selectedSet && selectedSet !== "default") {
    const customSetRef = ref(db, `questionSets/${currentUserId}/${selectedSet}`);
    onValue(customSetRef, (snapshot) => {
      const setData = snapshot.val();
      if (setData) {
        update(ref(db, "rooms/" + currentRoomCode + "/gameState"), {
          status: "started",
          customQuestions: setData.questions
        });
      } else {
        update(ref(db, "rooms/" + currentRoomCode + "/gameState"), { status: "started" });
      }
    }, { onlyOnce: true });
  } else {
    update(ref(db, "rooms/" + currentRoomCode + "/gameState"), { status: "started" });
  }
};

// ------------------------
// Quiz Game Functions
// ------------------------
const loadQuestion = () => {
  const questionsToUse = activeQuestions || questions;
  if (localCurrentQuestionIndex >= questionsToUse.length) {
    showResult();
    return;
  }
  const currentQuestion = questionsToUse[localCurrentQuestionIndex];
  questionElement.textContent = currentQuestion.question;
  optionsElement.innerHTML = "";
  nextButton.style.display = "none";
  currentQuestion.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.onclick = () => checkAnswer(option, btn);
    optionsElement.appendChild(btn);
  });
};

const checkAnswer = (answer, buttonClicked) => {
  const questionsToUse = activeQuestions || questions;
  const currentQuestion = questionsToUse[localCurrentQuestionIndex];
  
  const allButtons = optionsElement.querySelectorAll("button");
  allButtons.forEach((btn) => btn.disabled = true);
  
  if (answer === currentQuestion.correctAnswer) {
    localScore++;
    scoreElement.textContent = localScore;
    buttonClicked.style.backgroundColor = "green";
    setTimeout(nextQuestion, 0);
  } else {
    buttonClicked.style.backgroundColor = "red";
    setTimeout(nextQuestion, 2000);
  }
  
  update(ref(db, "rooms/" + currentRoomCode + "/players/" + currentUserId), {
    score: localScore
  });
};

const nextQuestion = () => {
  localCurrentQuestionIndex++;
  loadQuestion();
};

const showResult = () => {
  questionElement.textContent = `Game Over! Your final score is ${localScore}`;
  optionsElement.innerHTML = "";
  nextButton.style.display = "none";
};

// ------------------------
// Custom Question Set Creator Functions
// ------------------------
function addCustomQuestion() {
  const questionIndex = customQuestionsContainer.childElementCount + 1;
  const questionDiv = document.createElement("div");
  questionDiv.classList.add("custom-question-block");
  questionDiv.innerHTML = `
    <h4>Question ${questionIndex}</h4>
    <input type="text" class="custom-question-text" placeholder="Enter question" /><br>
    <input type="text" class="custom-option" placeholder="Option 1" />
    <input type="text" class="custom-option" placeholder="Option 2" />
    <input type="text" class="custom-option" placeholder="Option 3" />
    <input type="text" class="custom-option" placeholder="Option 4" /><br>
    <input type="text" class="custom-correct-answer" placeholder="Enter correct answer" /><br>
    <hr>
  `;
  customQuestionsContainer.appendChild(questionDiv);
}

function saveQuestionSet() {
  const setTitle = customSetTitleInput.value.trim();
  if (!setTitle) {
    alert("Please enter a title for your question set.");
    return;
  }
  const questionBlocks = customQuestionsContainer.getElementsByClassName("custom-question-block");
  let customQuestions = [];
  for (let block of questionBlocks) {
    const questionText = block.querySelector(".custom-question-text").value.trim();
    const optionElements = block.querySelectorAll(".custom-option");
    let options = [];
    optionElements.forEach(el => options.push(el.value.trim()));
    const correctAnswer = block.querySelector(".custom-correct-answer").value.trim();
    if (!questionText || options.some(o => !o) || !correctAnswer) {
      alert("Please fill out all fields for each question.");
      return;
    }
    customQuestions.push({
      question: questionText,
      options: options,
      correctAnswer: correctAnswer
    });
  }
  if (customQuestions.length === 0) {
    alert("Please add at least one question.");
    return;
  }
  set(ref(db, "questionSets/" + currentUserId + "/" + setTitle), {
    title: setTitle,
    questions: customQuestions
  })
  .then(() => {
    alert("Your question set was saved!");
    loadCustomSets();
  })
  .catch((error) => {
    alert("Error saving question set: " + error.message);
  });
}

function loadCustomSets() {
  if (!currentUserId) return;
  customSetDropdown.innerHTML = '<option value="default">Default Questions</option>';
  const customSetsRef = ref(db, "questionSets/" + currentUserId);
  onValue(customSetsRef, (snapshot) => {
    const sets = snapshot.val();
    if (sets) {
      for (let setKey in sets) {
        const option = document.createElement("option");
        option.value = setKey;
        option.textContent = sets[setKey].title;
        customSetDropdown.appendChild(option);
      }
    }
  });
}

// ------------------------
// Toggle Custom Set Creator UI
// ------------------------
toggleCustomSetButton.addEventListener("click", () => {
  if (customSetSection.style.display === "none" || !customSetSection.style.display) {
    customSetSection.style.display = "block";
  } else {
    customSetSection.style.display = "none";
  }
});

// ------------------------
// Event Listeners for Room, Game, and Custom Set Actions
// ------------------------
createRoomButton.addEventListener("click", createRoom);
joinRoomButton.addEventListener("click", joinRoom);
startGameButton.addEventListener("click", startGame);
nextButton.addEventListener("click", nextQuestion);
addQuestionButton.addEventListener("click", addCustomQuestion);
saveQuestionSetButton.addEventListener("click", saveQuestionSet);
refreshSetsButton.addEventListener("click", loadCustomSets);
