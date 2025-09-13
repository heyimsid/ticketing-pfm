@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

body {
  font-family: 'Inter', sans-serif;
  transition: background-color 0.3s, color 0.3s;
}

.dark-mode {
  background-color: #0F172A;
  color: #E2E8F0;
}

.light-mode {
  background-color: #F1F5F9;
  color: #1E293B;
}

.nav-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  background-color: transparent;
  color: #d1d5db;
  transition: color 0.2s, background-color 0.2s;
}

.nav-btn:hover {
  color: white;
}

.nav-btn.active {
  background-color: #4F46E5;
  color: white;
}
