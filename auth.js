// Import Firebase modules from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.8.1/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcOGXy2su-fQkHOue4jj7JdcV0iEgbBqc",
  authDomain: "the-game-93edd.firebaseapp.com",
  projectId: "the-game-93edd",
  storageBucket: "the-game-93edd.firebasestorage.app",
  messagingSenderId: "770818605932",
  appId: "1:770818605932:web:b7c81e65cd968e2f26a949",
  databaseURL: "https://the-game-93edd-default-rtdb.firebaseio.com"  // Ensure this URL is correct
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Function to toggle the UI based on login status
const toggleAuthUI = (user) => {
  const authSection = document.getElementById("auth-section");
  const userInfo = document.getElementById("user-info");
  const roomSection = document.getElementById("room-section");
  const userEmailSpan = document.getElementById("user-email");

  if (user) {
    // When logged in, hide auth forms and show user info and room lobby
    authSection.style.display = "none";
    userInfo.style.display = "block";
    roomSection.style.display = "block";
    userEmailSpan.textContent = user.email;
  } else {
    authSection.style.display = "block";
    userInfo.style.display = "none";
    roomSection.style.display = "none";
    userEmailSpan.textContent = "";
  }
};

// Sign-Up Event
document.getElementById("signup-button").addEventListener("click", () => {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Sign up successful!");
      toggleAuthUI(userCredential.user);
    })
    .catch((error) => {
      alert(error.message);
    });
});

// Log-In Event
document.getElementById("login-button").addEventListener("click", () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Log in successful!");
      toggleAuthUI(userCredential.user);
    })
    .catch((error) => {
      alert(error.message);
    });
});

// Log-Out Event
document.getElementById("logout-button").addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      alert("Logged out!");
      toggleAuthUI(null);
    })
    .catch((error) => {
      alert(error.message);
    });
});

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  toggleAuthUI(user);
});
