// public/script.js
const socket = io();

const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const timerDisplay = document.getElementById('timer');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const finalAnalysisDiv = document.getElementById('finalAnalysis');

let timeLeft = 120; // 2 minutes countdown
let timerInterval = null;

// Function to append messages to the chat window
function addMessage(content, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Start chat when Start button is clicked
startButton.addEventListener('click', () => {
  startButton.classList.add('hidden');
  // Show chat area and timer
  chatContainer.classList.remove('hidden');
  timerDisplay.classList.remove('hidden');
  messageInput.disabled = false;
  sendButton.disabled = false;
  startTimer();
});

// Restart chat when Restart button is clicked (reloads the page)
restartButton.addEventListener('click', () => {
  location.reload();
});

// Start the 2-minute countdown timer
function startTimer() {
  timeLeft = 120;
  timerDisplay.textContent = timeLeft;
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endChat();
    }
  }, 1000);
}

// When timer ends, disable input, show restart button, and ask for final analysis
function endChat() {
  messageInput.disabled = true;
  sendButton.disabled = true;
  restartButton.classList.remove('hidden');
  
  // Ask server for final analysis regarding partner's identity
  socket.emit('finalizeChat');
}

// Send message on button click
sendButton.addEventListener('click', () => {
  const msg = messageInput.value.trim();
  if (msg === "") return;
  
  addMessage(msg, 'user');
  socket.emit('userMessage', msg);
  messageInput.value = "";
});

// Listen for bot messages from the server
socket.on('botMessage', (msg) => {
  addMessage(msg, 'bot');
});

// Receive the final analysis from the server and display it
socket.on('finalClassification', (analysis) => {
  addMessage(analysis, 'bot');
  finalAnalysisDiv.textContent = "Final Analysis: " + analysis;
});
