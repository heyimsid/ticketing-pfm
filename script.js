import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase config – replace with your own keys ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

// --- State & Global Variables ---
let auth, db, userId;
let events = [];
let tickets = [];
let view = "events";  // "events", "my-tickets", "create-event"

// DOM refs
const contentContainer = document.getElementById("content-container");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalCloseBtn = document.getElementById("modal-close");
const modalOkBtn = document.getElementById("modal-ok");
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const navEventsBtn = document.getElementById("nav-events");
const navMyTicketsBtn = document.getElementById("nav-my-tickets");
const navCreateEventBtn = document.getElementById("nav-create-event");

// --- Utility functions ---
function showModal(title, message) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modal.classList.add("modal-open");
}

function hideModal() {
  modal.classList.remove("modal-open");
}

// Event listeners for modal
modalCloseBtn.addEventListener("click", hideModal);
modalOkBtn.addEventListener("click", hideModal);

// --- Firebase init ---
function initFirebase() {
  initializeApp(firebaseConfig);
  auth = getAuth();
  db = getFirestore();

  // recaptcha setup if phone auth used
  window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible"
  });

  onAuthStateChanged(auth, user => {
    if (user) {
      userId = user.uid;
      listenToEvents();
      listenToTickets();
      render();
    } else {
      signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    }
  });
}

// --- Listen data ---
function listenToEvents() {
  const eventsCol = collection(db, `events`);  // adjust path
  onSnapshot(eventsCol, snapshot => {
    events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

function listenToTickets() {
  const ticketsCol = collection(db, `tickets/${userId}/userTickets`);  // adjust path
  onSnapshot(ticketsCol, snapshot => {
    tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

// --- Navigation / theme toggle ---
navEventsBtn.addEventListener("click", () => { view = "events"; render(); });
navMyTicketsBtn.addEventListener("click", () => { view = "my-tickets"; render(); });
navCreateEventBtn.addEventListener("click", () => { view = "create-event"; render(); });

themeToggleBtn.addEventListener("click", () => {
  const htmlEl = document.documentElement;
  const current = htmlEl.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  htmlEl.setAttribute("data-theme", next);
});

// --- Rendering views ---
function render() {
  // highlight nav
  [navEventsBtn, navMyTicketsBtn, navCreateEventBtn].forEach(btn => btn.classList.remove("btn-primary"));
  if (view === "events") {
    navEventsBtn.classList.add("btn-primary");
  } else if (view === "my-tickets") {
    navMyTicketsBtn.classList.add("btn-primary");
  } else if (view === "create-event") {
    navCreateEventBtn.classList.add("btn-primary");
  }

  if (view === "events") {
    renderEvents();
  } else if (view === "my-tickets") {
    renderTickets();
  } else if (view === "create-event") {
    renderCreateEvent();
  }
}

function renderEvents() {
  if (events.length === 0) {
    contentContainer.innerHTML = `<p class="text-center text-muted">No events available.</p>`;
    return;
  }
  const cards = events.map((ev, idx) => `
    <div class="card card-hover bg-base-100 shadow-lg fade-in" style="animation-delay: ${idx * 100}ms;">
      <div class="card-body">
        <h2 class="card-title">${ev.name}</h2>
        <p class="text-sm opacity-70">${ev.date} • ${ev.location}</p>
        <p class="mt-2">${ev.description}</p>
        <div class="mt-4 flex justify-between items-center">
          <span class="text-lg font-bold text-primary">$${ev.price}</span>
          <button class="btn btn-primary book-btn" data-id="${ev.id}">
            ${ev.ticketsSold >= ev.totalTickets ? "Sold Out" : "Book Ticket"}
          </button>
        </div>
      </div>
    </div>
  `).join("");
  contentContainer.innerHTML = `<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">${cards}</div>`;

  // attach book button events
  document.querySelectorAll(".book-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const ev = events.find(e => e.id === id);
      if (!ev) return;
      if (ev.ticketsSold >= ev.totalTickets) {
        showModal("Oops", "This event is sold out!");
      } else {
        bookTicket(ev);
      }
    });
  });
}

function renderTickets() {
  if (!tickets || tickets.length === 0) {
    contentContainer.innerHTML = `<p class="text-center text-muted">You have not booked any tickets yet.</p>`;
    return;
  }
  const cards = tickets.map((tk, idx) => `
    <div class="card bg-base-100 shadow fade-in" style="animation-delay: ${idx * 100}ms;">
      <div class="card-body">
        <h2 class="card-title">${tk.eventName}</h2>
        <p class="text-sm opacity-70">Booking ID: ${tk.id}</p>
        <p class="text-sm opacity-70">Booked on: ${new Date(tk.bookingDate).toLocaleDateString()}</p>
        <span class="badge badge-primary">$${tk.price}</span>
      </div>
    </div>
  `).join("");
  contentContainer.innerHTML = `<div class="space-y-4">${cards}</div>`;
}

function renderCreateEvent() {
  contentContainer.innerHTML = `
    <div class="card bg-base-100 shadow-lg p-6">
      <h2 class="text-2xl font-bold mb-4">Create New Event</h2>
      <form id="create-form" class="space-y-4">
        <input type="text" name="name" placeholder="Event Name" required class="input input-bordered w-full" />
        <input type="text" name="location" placeholder="Location" required class="input input-bordered w-full" />
        <input type="date" name="date" required class="input input-bordered w-full" />
        <textarea name="description" placeholder="Description" class="textarea textarea-bordered w-full"></textarea>
        <input type="number" name="price" placeholder="Ticket Price" required class="input input-bordered w-full" />
        <input type="number" name="totalTickets" placeholder="Total Tickets" required class="input input-bordered w-full" />
        <button type="submit" class="btn btn-primary w-full">Create Event</button>
      </form>
    </div>
  `;

  document.getElementById("create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const newEv = {
      name: f.name.value,
      location: f.location.value,
      date: f.date.value,
      description: f.description.value,
      price: parseFloat(f.price.value),
      totalTickets: parseInt(f.totalTickets.value),
      ticketsSold: 0
    };
    try {
      await addDoc(collection(db, `events`), newEv);
      showModal("Success", `Event "${newEv.name}" created!`);
      view = "events";
      render();
    } catch (err) {
      console.error("Error:", err);
      showModal("Error", "Failed to create event.");
    }
  });
}

async function bookTicket(ev) {
  try {
    // example: add to user’s tickets
    const ticketsRef = collection(db, `tickets/${userId}/userTickets`);
    await addDoc(ticketsRef, {
      eventId: ev.id,
      eventName: ev.name,
      bookingDate: new Date().toISOString(),
      price: ev.price
    });
    // increment tickets sold in event
    const evDoc = doc(db, `events`, ev.id);
    await updateDoc(evDoc, { ticketsSold: (ev.ticketsSold || 0) + 1 });
    showModal("Booked!", `You booked "${ev.name}"`);
  } catch (err) {
    console.error("Book error:", err);
    showModal("Error", "Unable to book.");
  }
}

// --- Startup ---
window.addEventListener("DOMContentLoaded", () => {
  initFirebase();
});
