import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, query, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// === Global State ===
let app, db, auth, userId;
let events = [];
let userTickets = [];
let view = "events";
let theme = "dark";
let confirmationResult = null;

// === DOM References ===
const contentContainer = document.getElementById("content-container");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalCloseBtn = document.getElementById("modal-close");
const themeToggle = document.getElementById("theme-toggle");

// === Utility ===
function showModal(title, message) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modal.classList.remove("hidden");
}

modalCloseBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// === Firebase Init ===
function initFirebase() {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible"
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userId = user.uid;
      loadEvents();
      loadTickets();
      render();
    } else {
      signInAnonymously(auth).catch(console.error);
    }
  });
}

// === Load Data ===
function loadEvents() {
  const eventsRef = collection(db, `artifacts/app/users/${userId}/events`);
  onSnapshot(eventsRef, snapshot => {
    events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  });
}

function loadTickets() {
  const ticketsRef = collection(db, `artifacts/app/users/${userId}/tickets`);
  onSnapshot(ticketsRef, snapshot => {
    userTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  });
}

// === Rendering ===
function render() {
  updateNav();

  if (!userId) {
    contentContainer.innerHTML = `<p class="text-center">Authenticating...</p>`;
    return;
  }

  switch (view) {
    case "events":
      renderEvents();
      break;
    case "my-tickets":
      renderTickets();
      break;
    case "create-event":
      renderCreateEvent();
      break;
  }
}

function renderEvents() {
  if (events.length === 0) {
    contentContainer.innerHTML = `<p class="text-center text-gray-400">No events yet. Create one!</p>`;
    return;
  }

  const html = events.map(event => `
    <div class="p-4 bg-gray-800 rounded-lg shadow-md space-y-2">
      <h3 class="text-xl font-bold">${event.name}</h3>
      <p>${event.date} at ${event.location}</p>
      <p class="text-sm">${event.description}</p>
      <p class="text-indigo-400 font-semibold">$${event.price}</p>
      <button class="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded book-btn" data-id="${event.id}">Book Ticket</button>
    </div>
  `).join("");

  contentContainer.innerHTML = `<div class="grid gap-4">${html}</div>`;

  document.querySelectorAll(".book-btn").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const evt = events.find(e => e.id === id);
      handleBookTicket(evt);
    });
  });
}

function renderTickets() {
  if (userTickets.length === 0) {
    contentContainer.innerHTML = `<p class="text-center text-gray-400">No tickets booked yet.</p>`;
    return;
  }

  const html = userTickets.map(ticket => `
   
