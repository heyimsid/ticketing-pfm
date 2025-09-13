import { initializeApp } from "https://www.google.com/search?q=https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.google.com/search?q=https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, query, where, updateDoc, setDoc, getDoc } from "https://www.google.com/search?q=https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global State & Firebase Initialization ---
let app, db, auth, userId, userProfile, isProfileComplete;
let events = [];
let userTickets = [];
let view = 'events';
let confirmationResult = null;
let theme = 'dark';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- DOM Element References ---
const contentContainer = document.getElementById('content-container');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close');
const themeToggle = document.getElementById('theme-toggle');

// --- Firebase Functions ---
const initFirebase = () => {
if (Object.keys(firebaseConfig).length === 0) {
console.error("Firebase config is not available.");
renderLogin();
return;
}
app = initializeApp(firebaseConfig);
db = getFirestore(app);
auth = getAuth(app);

if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {}
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        const profileDocRef = doc(db, `/artifacts/${appId}/users/${userId}/profile/details`);
        const profileSnap = await getDoc(profileDocRef);
        if (profileSnap.exists()) {
            userProfile = profileSnap.data();
            isProfileComplete = true;
            setupListeners();
            render();
        } else {
            isProfileComplete = false;
            render();
        }
    } else {
        userId = null;
        userProfile = null;
        isProfileComplete = false;
        renderLogin();
    }
});

if (initialAuthToken) {
    signInWithCustomToken(auth, initialAuthToken).catch(console.error);
} else {
    signInAnonymously(auth).catch(console.error);
}

};

const setupListeners = () => {
const eventsQuery = query(collection(db, /artifacts/${appId}/users/${userId}/events));
onSnapshot(eventsQuery, (snapshot) => {
events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
render();
});

const ticketsQuery = query(collection(db, `/artifacts/${appId}/users/${userId}/tickets`));
onSnapshot(ticketsQuery, (snapshot) => {
    userTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
});

};

// --- Authentication & Profile ---
const handlePhoneSignIn = async (e) => {
e.preventDefault();
const phoneNumber = e.target.elements['phone-number'].value;
try {
const formattedPhoneNumber = +${phoneNumber.replace(/\D/g, '')};
const appVerifier = window.recaptchaVerifier;
const result = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
confirmationResult = result;
showModal("OTP Sent", A verification code has been sent to ${formattedPhoneNumber}.);
renderLogin('otp');
} catch (error) {
console.error("Phone sign-in failed: ", error);
showModal("Error", "Failed to send OTP. Please try again.");
}
};

const handleOtpVerification = async (e) => {
e.preventDefault();
const otp = e.target.elements['otp'].value;
try {
await confirmationResult.confirm(otp);
showModal("Success", "Phone number verified!");
} catch (error) {
console.error("OTP verification failed: ", error);
showModal("Error", "Invalid OTP. Please try again.");
}
};

const handleProfileSubmit = async (e) => {
e.preventDefault();
const form = e.target.elements;
const profileForm = {
name: form['profile-name'].value,
semester: form['profile-semester'].value,
class: form['profile-class'].value,
rollNo: form['profile-rollNo'].value
};
try {
const profileDocRef = doc(db, /artifacts/${appId}/users/${userId}/profile/details);
await setDoc(profileDocRef, profileForm);
isProfileComplete = true;
showModal("Profile Updated", "Your profile has been saved successfully!");
render();
} catch (error) {
console.error("Error saving profile: ", error);
showModal("Error", "Failed to save profile. Please try again.");
}
};

// --- Event Handling ---
const handleCreateEvent = async (event) => {
event.preventDefault();
if (!db || !userId) {
showModal("Error", "You must be logged in to create an event.");
return;
}
const form = event.target.elements;
const eventData = {
name: form['event-name'].value,
date: form['event-date'].value,
location: form['event-location'].value,
poster: form['event-poster'].value,
description: form['event-description'].value,
price: parseFloat(form['event-price'].value),
totalTickets: parseInt(form['event-tickets'].value),
ticketsSold: 0,
creatorId: userId,
};
try {
await addDoc(collection(db, /artifacts/${appId}/users/${userId}/events), eventData);
showModal("Success", Event "${eventData.name}" created successfully!);
view = 'events';
render();
} catch (e) {
console.error("Error creating event: ", e);
showModal("Error", "Failed to create event. Please try again.");
}
};

const handleBookTicket = async (eventId, totalTickets, ticketsSold, eventName, eventPrice) => {
if (!db || !userId) {
showModal("Error", "You must be logged in to book a ticket.");
return;
}
if (ticketsSold >= totalTickets) {
showModal("Error", "This event is sold out!");
return;
}
try {
const eventDocRef = doc(db, /artifacts/${appId}/users/${userId}/events, eventId);
await addDoc(collection(db, /artifacts/${appId}/users/${userId}/tickets), {
eventId: eventId,
eventName: eventName,
price: eventPrice,
bookingDate: new Date().toISOString(),
userId: userId
});
await updateDoc(eventDocRef, {
ticketsSold: ticketsSold + 1
});
showModal("Success", Ticket booked for "${eventName}"!);
} catch (e) {
console.error("Error booking ticket: ", e);
showModal("Error", "Failed to book ticket. Please try again.");
}
};

// --- Rendering Functions ---
const render = () => {
updateNav();
if (!userId) {
renderLogin();
} else if (!isProfileComplete) {
renderProfileForm();
} else {
switch (view) {
case 'events':
renderEvents();
break;
case 'my-tickets':
renderMyTickets();
break;
case 'create-event':
renderCreateEventForm();
break;
default:
renderEvents();
}
}
};

const renderLogin = (mode = 'phone') => {
const isDarkMode = theme === 'dark';
let formHtml = '';
if (mode === 'phone') {
formHtml = <form id="phone-auth-form" class="p-6 rounded-xl shadow-lg space-y-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}"> <input type="tel" name="phone-number" placeholder="Phone Number (e.g., +919876543210)" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <button type="submit" class="w-full font-semibold py-3 px-6 rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700 text-white">Send OTP</button> </form>;
} else {
formHtml = <form id="otp-form" class="p-6 rounded-xl shadow-lg space-y-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}"> <input type="text" name="otp" placeholder="Enter OTP" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <button type="submit" class="w-full font-semibold py-3 px-6 rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700 text-white">Verify OTP</button> </form>;
}
contentContainer.innerHTML = <div class="space-y-6"> <h2 class="text-3xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}">Login</h2> ${formHtml} </div>;
const form = document.getElementById('phone-auth-form') || document.getElementById('otp-form');
if (form) {
form.addEventListener('submit', mode === 'phone' ? handlePhoneSignIn : handleOtpVerification);
}
};

const renderProfileForm = () => {
const isDarkMode = theme === 'dark';
contentContainer.innerHTML = <div class="space-y-6"> <h2 class="text-3xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}">Complete Your Profile</h2> <form id="profile-form" class="p-6 rounded-xl shadow-lg space-y-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}"> <input type="text" name="profile-name" placeholder="Full Name" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <input type="text" name="profile-semester" placeholder="Semester" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <input type="text" name="profile-class" placeholder="Class" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <input type="text" name="profile-rollNo" placeholder="Roll No" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <button type="submit" class="w-full font-semibold py-3 px-6 rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700 text-white">Save Profile</button> </form> </div>;
document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);
};

const renderEvents = () => {
const isDarkMode = theme === 'dark';
let eventsHtml = '';
if (events.length === 0) {
eventsHtml = <p class="text-center p-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}">No events available. Create one to get started!</p>;
} else {
eventsHtml = <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> ${events.map(event => 
<div class="p-4 rounded-xl shadow-lg flex flex-col justify-between space-y-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}">
<div class="flex-1 space-y-2">
<h3 class="text-xl font-bold isDarkMode? 
′
 text−white 
′
 : 
′
 text−gray−800 
′
 "{event.name}</h3>
${event.poster ? <img src="${event.poster}" alt="${event.name} poster" class="rounded-lg w-full h-48 object-cover"> : ''}
<p class="text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}"><span class="font-semibold">Location:</span> ${event.location}</p>
<p class="text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}"><span class="font-semibold">Date:</span> ${event.date}</p>
<p class="text-sm isDarkMode? 
′
 text−gray−300 
′
 : 
′
 text−gray−700 
′
 "{event.description}</p>
</div>
<div class="flex items-center justify-between mt-4">
<p class="text-lg font-semibold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}">Price: $${event.price.toFixed(2)}</p>
<p class="text-sm isDarkMode? 
′
 text−gray−500 
′
 : 
′
 text−gray−500 
′
 "{event.ticketsSold} of ${event.totalTickets} sold</p>
</div>
<button class="font-semibold py-2 px-4 rounded-lg transition-colors mt-4 event.ticketsSold=event.totalTickets? 
′
 bg−gray−600cursor−not−allowedtext−gray−400 
′
 : 
′
 bg−indigo−600hover:bg−indigo−700text−whitebook−ticket−btn 
′
 "data−event−id="{event.id}">
${event.ticketsSold >= event.totalTickets ? 'Sold Out' : 'Book Ticket'}
</button>
</div>
).join('')} </div>;
}
contentContainer.innerHTML = <div class="space-y-6"><h2 class="text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">Available Events</h2>${eventsHtml}</div>;
document.querySelectorAll('.book-ticket-btn').forEach(button => {
const event = events.find(e => e.id === button.dataset.eventId);
if (event) {
button.addEventListener('click', () => handleBookTicket(event.id, event.totalTickets, event.ticketsSold, event.name, event.price));
}
});
};

const renderMyTickets = () => {
const isDarkMode = theme === 'dark';
let ticketsHtml = '';
if (userTickets.length === 0) {
ticketsHtml = <p class="text-center p-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}">You have no tickets yet. Book an event to see your tickets here!</p>;
} else {
ticketsHtml = userTickets.map(ticket => <div class="p-6 rounded-xl shadow-lg flex justify-between items-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}"> <div class="flex-1"> <h3 class="text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">${ticket.eventName}</h3> <p class="text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}">Ticket ID: ${ticket.id}</p> <p class="text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}">Booked: ${new Date(ticket.bookingDate).toLocaleDateString()}</p> </div> <span class="font-semibold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}">$${ticket.price.toFixed(2)}</span> </div>).join('');
}
contentContainer.innerHTML = <div class="space-y-6"><h2 class="text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">My Tickets</h2>${ticketsHtml}</div>;
};

const renderCreateEventForm = () => {
const isDarkMode = theme === 'dark';
contentContainer.innerHTML = <div class="space-y-6"> <h2 class="text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}">Create Event</h2> <form id="create-event-form" class="p-6 rounded-xl shadow-lg space-y-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}"> <input type="text" name="event-name" placeholder="Event Name" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <input type="text" name="event-poster" placeholder="Poster URL (optional)" class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <textarea name="event-description" placeholder="Event Description" rows="4" class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"></textarea> <input type="date" name="event-date" placeholder="Date" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <input type="text" name="event-location" placeholder="Location" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <input type="number" name="event-price" step="0.01" placeholder="Ticket Price" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <input type="number" name="event-tickets" placeholder="Total Tickets" required class="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-300'}"> <button type="submit" class="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors hover:bg-indigo-700"> Create Event </button> </form> </div>;
document.getElementById('create-event-form').addEventListener('submit', handleCreateEvent);
};

// --- UI & Event Listeners ---
const updateNav = () => {
const isDarkMode = theme === 'dark';
const navButtons = document.querySelectorAll('#main-nav button');
navButtons.forEach(button => {
button.classList.remove('bg-indigo-600', 'text-white', 'text-gray-300', 'hover:text-white');
if (button.id === nav-${view}) {
button.classList.add('bg-indigo-600', 'text-white');
} else {
button.classList.add('text-gray-300', 'hover:text-white');
}
});

const body = document.body;
body.className = `p-4 sm:p-8 ${isDarkMode ? 'dark-mode' : 'light-mode'}`;

};

const setupEventListeners = () => {
document.getElementById('nav-events').addEventListener('click', () => { view = 'events'; render(); });
document.getElementById('nav-my-tickets').addEventListener('click', () => { view = 'my-tickets'; render(); });
document.getElementById('nav-create-event').addEventListener('click', () => { view = 'create-event'; render(); });

modalCloseBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

themeToggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    render(); // Rerender content to apply theme classes
});

};

// Initial setup
window.onload = () => {
initFirebase();
setupEventListeners();
updateNav();
};
