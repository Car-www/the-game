// Import Firebase App, Database, and Auth modules from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-auth.js";

// Use the same Firebase configuration as in auth.js
const firebaseConfig = {
  apiKey: "AIzaSyAcOGXy2su-fQkHOue4jj7JdcV0iEgbBqc",
  authDomain: "the-game-93edd.firebaseapp.com",
  projectId: "the-game-93edd",
  storageBucket: "the-game-93edd.firebasestorage.app",
  messagingSenderId: "770818605932",
  appId: "1:770818605932:web:b7c81e65cd968e2f26a949",
  databaseURL: "https://the-game-93edd-default-rtdb.firebaseio.com"  // Ensure this URL is correct
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// ------------------------
// Variables for Room and Game State
// ------------------------
let currentRoomCode = null;
let currentUserId = null; // Will use auth.currentUser.uid
let isHost = false;

let localScore = 0;
let localCurrentQuestionIndex = 0;

// ------------------------
// UI Elements for Room Lobby
// ------------------------
const createRoomButton = document.getElementById("create-room-button");
const joinRoomButton = document.getElementById("join-room-button");
const joinRoomInput = document.getElementById("join-room-code");
const roomCodeDisplay = document.getElementById("room-code-display");
const playersList = document.getElementById("players-list");
const startGameButton = document.getElementById("start-game-button");

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
  currentUserId = auth.currentUser.uid;

  // Create a room entry in the database using the UID as key
  set(ref(db, "rooms/" + currentRoomCode), {
    host: currentUserId,
    gameState: { status: "waiting", currentQuestionIndex: 0 },
    players: {
      [currentUserId]: { email: auth.currentUser.email, score: 0 }
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
  // Add the current user to the room’s players list using their UID
  set(ref(db, "rooms/" + currentRoomCode + "/players/" + currentUserId), {
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

// Listen for changes in the room data
const listenToRoom = () => {
  const roomRef = ref(db, "rooms/" + currentRoomCode);
  onValue(roomRef, (snapshot) => {
    const roomData = snapshot.val();
    if (roomData) {
      // Update players list
      playersList.innerHTML = "";
      for (let playerId in roomData.players) {
        const li = document.createElement("li");
        li.textContent =
          roomData.players[playerId].email +
          " - Score: " +
          roomData.players[playerId].score;
        playersList.appendChild(li);
      }
      // If game has started, show the game section
      if (roomData.gameState && roomData.gameState.status === "started") {
        localCurrentQuestionIndex = roomData.gameState.currentQuestionIndex;
        loadQuestion();
        gameSection.style.display = "block";
        // Optionally, hide the room lobby for full-screen game view
        document.getElementById("room-section").style.display = "none";
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
  nextButton.style.display = "none";
  currentQuestion.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.onclick = () => checkAnswer(option);
    optionsElement.appendChild(btn);
  });
};

// Check the answer and update the score
const checkAnswer = (answer) => {
  const currentQuestion = questions[localCurrentQuestionIndex];
  if (answer === currentQuestion.correctAnswer) {
    localScore++;
    scoreElement.textContent = localScore;
    // Update the player's score in the database
    update(ref(db, "rooms/" + currentRoomCode + "/players/" + currentUserId), {
      score: localScore
    });
  }
  nextButton.style.display = "block";
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
