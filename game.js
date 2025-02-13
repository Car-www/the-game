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
let localCurrentQuestionIndex = 0;

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
// New: Player Name input
const playerNameInput = document.getElementById("player-name");

// ------------------------
// UI Elements for the Quiz Game
// ------------------------
const gameSection = document.getElementById("game-section");
const questionElement = document.getElementById("question");
const optionsElement = document.getElementById("options");
const nextButton = document.getElementById("next-button");
const scoreElement = document.getElementById("score");

// ------------------------
// Sample Quiz Questions
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
    })
    .catch((error) => {
      console.error("Email Sign-Up Error:", error);
      alert(error.message);
    });
});

// ------------------------
// Room Creation and Joining Functions
// ------------------------

// Create a room (host only)
const createRoom = () => {
  if (!auth.currentUser) {
    alert("You must be logged in to create a room.");
    return;
  }
  currentRoomCode = generateRoomCode();
  isHost = true;
  // Use the logged-in user's UID
  currentUserId = auth.currentUser.uid;
  
  // Determine player's chosen name:
  const chosenName = playerNameInput.value.trim() || auth.currentUser.displayName || auth.currentUser.email;
  
  // Create a room entry in the database using the UID as key
  set(ref(db, "rooms/" + currentRoomCode), {
    host: currentUserId,
    gameState: { status: "waiting", currentQuestionIndex: 0 },
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

// Join an existing room
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
  // Determine player's chosen name:
  const chosenName = playerNameInput.value.trim() || auth.currentUser.displayName || auth.currentUser.email;
  
  // Add the current user to the room’s players list using their UID
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
        li.textContent =
          roomData.players[playerKey].name +
          " - Score: " +
          roomData.players[playerKey].score;
        playersList.appendChild(li);
      }
      // If game has started, show the game section
      if (roomData.gameState && roomData.gameState.status === "started") {
        localCurrentQuestionIndex = roomData.gameState.currentQuestionIndex;
        loadQuestion();
        gameSection.style.display = "block";
        // Optionally hide the room lobby for full-screen game view
        roomSection.style.display = "none";
      }
    }
  });
};

// Host starts the game by updating the room’s game state
const startGame = () => {
  if (!isHost) return;
  update(ref(db, "rooms/" + currentRoomCode + "/gameState"), {
    status: "started",
    currentQuestionIndex: 0
  });
};

// ------------------------
// Quiz Game Functions (Multiplayer)
// ------------------------

// Load the current question
const loadQuestion = () => {
  if (localCurrentQuestionIndex >= questions.length) {
    showResult();
    return;
  }
  const currentQuestion = questions[localCurrentQuestionIndex];
  questionElement.textContent = currentQuestion.question;
  optionsElement.innerHTML = "";
  nextButton.style.display = "none"; // Hide the next button initially
  currentQuestion.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.onclick = () => checkAnswer(option, btn); // Pass the button element to disable after answering
    optionsElement.appendChild(btn);
  });
};

// Check the answer and update the score
const checkAnswer = (answer, buttonClicked) => {
  const currentQuestion = questions[localCurrentQuestionIndex];
  
  // Disable all the options after answering
  const allButtons = optionsElement.querySelectorAll("button");
  allButtons.forEach((btn) => {
    btn.disabled = true; // Disable the buttons after answer
  });

  // Show feedback: correct or incorrect
  if (answer === currentQuestion.correctAnswer) {
    localScore++;
    scoreElement.textContent = localScore;
    buttonClicked.style.backgroundColor = "green"; // Green for correct answer
    // Automatically move to the next question if correct
    setTimeout(nextQuestion, 0);  // No delay for correct answer, move to next immediately
  } else {
    buttonClicked.style.backgroundColor = "red"; // Red for incorrect answer
    // Introduce a 2-second delay before moving to the next question
    setTimeout(nextQuestion, 2000);  // 2-second delay for incorrect answer
  }

  // Update the player's score in the database
  update(ref(db, "rooms/" + currentRoomCode + "/players/" + currentUserId), {
    score: localScore
  });
};


// Host triggers the next question; all players see the update via the database
const nextQuestion = () => {
  localCurrentQuestionIndex++;
  if (isHost) {
    update(ref(db, "rooms/" + currentRoomCode + "/gameState"), {
      currentQuestionIndex: localCurrentQuestionIndex
    });
  }
  loadQuestion();
};

// Show final result when the quiz is over
const showResult = () => {
  questionElement.textContent = `Game Over! Your final score is ${localScore}`;
  optionsElement.innerHTML = "";
  nextButton.style.display = "none";
};

// ------------------------
// Event Listeners for Room and Game Actions
// ------------------------
createRoomButton.addEventListener("click", createRoom);
joinRoomButton.addEventListener("click", joinRoom);
startGameButton.addEventListener("click", startGame);
nextButton.addEventListener("click", nextQuestion);
