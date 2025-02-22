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
const userClassificationDiv = document.getElementById('userClassification');
const classificationInput = document.getElementById('classificationInput');
const submitClassificationButton = document.getElementById('submitClassificationButton');

let timeLeft = 120; // 2 minutes countdown
let timerInterval = null;
let currentChatId = null;  // to store the chat ID returned by the server

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

// Send message on button click
sendButton.addEventListener('click', sendMessage);

// Also send message when pressing Enter in the message input
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (msg === "") return;
  
  addMessage(msg, 'user');
  socket.emit('userMessage', msg);
  messageInput.value = "";
}

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

// Listen for bot messages from the server
socket.on('botMessage', (msg) => {
  addMessage(msg, 'bot');
});

// When final classification is received from the server, show the user classification input
socket.on('finalClassification', (data) => {
  const { classification, chatId } = data;
  addMessage(classification, 'bot');
  finalAnalysisDiv.textContent = "Final Analysis: " + classification;
  currentChatId = chatId;
  // Reveal the actual classification input so the user can provide their classification
  userClassificationDiv.classList.remove('hidden');
});


// Listen for response after saving chat
socket.on('saveChatResponse', (response) => {
  alert(response);
});

// Handle user submitting actual classification
submitClassificationButton.addEventListener('click', () => {
  const actualClassification = classificationInput.value.trim();
  if (actualClassification === "" || currentChatId === null) return;
  socket.emit('saveChat', { chatId: currentChatId, actualClassification });
  // Optionally, disable the classification input after submission
  classificationInput.disabled = true;
  submitClassificationButton.disabled = true;
});
