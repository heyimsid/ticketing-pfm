
@import url('https://www.google.com/search?q=https://fonts.googleapis.com/css2%3Ffamily%3DInter:wght%40400%3B600%3B700%3B800%26display%3Dswap');

body {
font-family: 'Inter', sans-serif;
transition: background-color 0.3s, color 0.3s;
}

/* Dark Mode /
.dark-mode {
background-color: #0F172A;
color: #E2E8F0;
}
.dark-mode .card {
background-color: #1E293B;
border: 1px solid #334155;
color: #E2E8F0;
}
.dark-mode .input-field {
background-color: #0F172A;
border: 1px solid #334155;
color: #E2E8F0;
-webkit-appearance: none; / Fix for Safari input color */
}
.dark-mode .placeholder-gray-500::placeholder {
color: #9CA3AF;
}

/* Light Mode */
.light-mode {
background-color: #F1F5F9;
color: #1E293B;
}
.light-mode .card {
background-color: #FFFFFF;
border: 1px solid #E2E8F0;
color: #1E293B;
}
.light-mode .input-field {
background-color: #F8FAFC;
border: 1px solid #E2E8F0;
color: #1E293B;
}
.light-mode .placeholder-gray-500::placeholder {
color: #64748B;
}

.btn-primary {
background-color: #4F46E5;
transition: background-color 0.3s;
}
.btn-primary:hover {
background-color: #6366F1;
}

.input-field:focus {
outline: none;
border-color: #4F46E5;
}
