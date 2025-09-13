import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, query, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Fill in your Firebase config here ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- Global state ---
let app, db, auth, userId;
let events = [];
let userTickets = [];
let view = 'events';
let theme = 'dark';
let confirmationResult = null;

// --- DOM references ---
const contentContainer = document.getElementById('content-container');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close');
const themeToggle = document.getElementById('theme-toggle');
const mainNavBtnEvent = document.getElementById('nav-events');
const mainNavBtnMyTickets = document.getElementById('nav-my-tickets');
const mainNavBtnCreateEvent = document.getElementById('nav-create-event');

// --- Utility functions ---
function showModal(title, message) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modal.classList.add('modal-open');
}

modalCloseBtn.addEventListener('click', () => {
  modal.classList.remove('modal-open');
});

// --- Firebase initialization ---
function initFirebase() {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible'
  });

  onAuthStateChanged(auth, user => {
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

// --- Data loading ---
function loadEvents() {
  const eventsRef = collection(db, `artifacts/yourAppId/users/${userId}/events`);
  onSnapshot(eventsRef, snapshot => {
    events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

function loadTickets() {
  const ticketsRef = collection(db, `artifacts/yourAppId/users/${userId}/tickets`);
  onSnapshot(ticketsRef, snapshot => {
    userTickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

// --- View rendering ---
function updateNavButtons() {
  // Reset classes
  [mainNavBtnEvent, mainNavBtnMyTickets, mainNavBtnCreateEvent].forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-ghost');
  });
  // Set active
  if (view === 'events') {
    mainNavBtnEvent.classList.remove('btn-ghost');
    mainNavBtnEvent.classList.add('btn-primary');
  } else if (view === 'my-tickets') {
    mainNavBtnMyTickets.classList.remove('btn-ghost');
    mainNavBtnMyTickets.classList.add('btn-primary');
  } else if (view === 'create-event') {
    mainNavBtnCreateEvent.classList.remove('btn-ghost');
    mainNavBtnCreateEvent.classList.add('btn-primary');
  }
}

function render() {
  updateNavButtons();

  if (!userId) {
    contentContainer.innerHTML = `<div class="text-center py-10"><span class="loading loading-spinner loading-lg"></span></div>`;
    return;
  }

  if (view === 'events') {
    renderEvents();
  } else if (view === 'my-tickets') {
    renderTickets();
  } else if (view === 'create-event') {
    renderCreateEvent();
  }
}

function renderEvents() {
  if (events.length === 0) {
    contentContainer.innerHTML = `<p class="text-center text-gray-500 py-10">No events available. Create one to get started!</p>`;
    return;
  }

  const html = events.map((event, idx) => `
    <div class="card bg-base-100 shadow-lg transition transform hover:scale-105 fade-in" style="animation-delay: ${idx * 100}ms;">
      <div class="card-body">
        <h2 class="card-title">${event.name}</h2>
        <p class="text-sm">${event.date} @ ${event.location}</p>
        <p class="text-sm opacity-70">${event.description}</p>
        <div class="mt-4 flex justify-between items-center">
          <span class="font-bold text-lg text-primary">$${event.price.toFixed(2)}</span>
          <button class="btn btn-primary book-btn" data-id="${event.id}">
            ${event.ticketsSold >= event.totalTickets ? 'Sold Out' : 'Book Ticket'}
          </button>
        </div>
      </div>
    </div>
  `).join('');

  contentContainer.innerHTML = `<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">${html}</div>`;

  document.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const evt = events.find(e => e.id === id);
      if (evt) handleBookTicket(evt);
    });
  });
}

function renderTickets() {
  if (userTickets.length === 0) {
    contentContainer.innerHTML = `<p class="text-center text-gray-500 py-10">You have not booked any tickets yet.</p>`;
    return;
  }

  const html = userTickets.map((ticket, idx) => `
    <div class="card bg-base-100 shadow-lg fade-in" style="animation-delay: ${idx * 100}ms;">
      <div class="card-body flex justify-between items-center">
        <div>
          <h2 class="card-title">${ticket.eventName}</h2>
          <p class="text-sm opacity-70">Booking ID: ${ticket.id}</p>
          <p class="text-sm opacity-70">Booked on: ${new Date(ticket.bookingDate).toLocaleDateString()}</p>
        </div>
        <span class="font-bold text-lg text-primary">$${ticket.price.toFixed(2)}</span>
      </div>
    </div>
  `).join('');

  contentContainer.innerHTML = `<div class="space-y-4">${html}</div>`;
}

function renderCreateEvent() {
  contentContainer.innerHTML = `
    <div class="card bg-base-100 p-6 shadow-lg">
      <h2 class="text-2xl font-bold mb-4">Create Event</h2>
      <form id="create-event-form" class="space-y-4">
        <input type="text" name="event-name" placeholder="Event Name" required class="input input-bordered w-full" />
        <input type="text" name="event-poster" placeholder="Poster URL (optional)" class="input input-bordered w-full" />
        <textarea name="event-description" placeholder="Description" class="textarea textarea-bordered w-full" rows="3"></textarea>
        <input type="date" name="event-date" required class="input input-bordered w-full" />
        <input type="text" name="event-location" placeholder="Location" required class="input input-bordered w-full" />
        <input type="number" name="event-price" placeholder="Ticket Price" required step="0.01" class="input input-bordered w-full" />
        <input type="number" name="event-tickets" placeholder="Total Tickets" required class="input input-bordered w-full" />
        <button type="submit" class="btn btn-primary w-full">Create Event</button>
      </form>
    </div>
  `;

  const form = document.getElementById('create-event-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const eventData = {
      name: f['event-name'].value,
      poster: f['event-poster'].value || '',
      description: f['event-description'].value,
      date: f['event-date'].value,
      location: f['event-location'].value,
      price: parseFloat(f['event-price'].value),
      totalTickets: parseInt(f['event-tickets'].value),
      ticketsSold: 0,
      creatorId: userId
    };
    try {
      await addDoc(collection(db, `artifacts/yourAppId/users/${userId}/events`), eventData);
      showModal("Success", `Event "${eventData.name}" created successfully!`);
      view = 'events';
      render();
    } catch(err) {
      console.error(err);
      showModal("Error", "Failed to create event.");
    }
  });
}

async function handleBookTicket(evt) {
  if (!evt) return;
  if (evt.ticketsSold >= evt.totalTickets) {
    showModal("Oops", "This event is sold out!");
    return;
  }
  try {
    const ticketData = {
      eventId: evt.id,
      eventName: evt.name,
      price: evt.price,
      bookingDate: (new Date()).toISOString(),
      userId: userId
    };
    await addDoc(collection(db, `artifacts/yourAppId/users/${userId}/tickets`), ticketData);
    const eventDoc = doc(db, `artifacts/yourAppId/users/${userId}/events`, evt.id);
    await updateDoc(eventDoc, { ticketsSold: (evt.ticketsSold || 0) + 1 });
    showModal("Booked!", `Your ticket for "${evt.name}" is confirmed.`);
  } catch(err) {
    console.error(err);
    showModal("Error", "Unable to book ticket.");
  }
}

// --- Navigation & theme toggle ---
themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
});

mainNavBtnEvent.addEventListener('click', () => { view = 'events'; render(); });
mainNavBtnMyTickets.addEventListener('click', () => { view = 'my-tickets'; render(); });
mainNavBtnCreateEvent.addEventListener('click', () => { view = 'create-event'; render(); });

// --- Initialize ---
window.addEventListener('DOMContentLoaded', () => {
  initFirebase();
});
