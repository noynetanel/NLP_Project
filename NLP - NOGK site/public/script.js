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
let currentChatId = null;  // will store the chat DB ID

// Recursive typeMessage function to simulate natural typing
function typeMessage(input, message, index = 0) {
  if (index < message.length) {
    input.value += message.charAt(index);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(() => {
      typeMessage(input, message, index + 1);
    }, 100);
  }
}

// Append message to chat window
function addMessage(content, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Start chat on Start button click (only once)
startButton.addEventListener('click', () => {
  startButton.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  timerDisplay.classList.remove('hidden');
  messageInput.disabled = false;
  sendButton.disabled = false;
  startTimer();
});

// Restart chat by reloading the page
restartButton.addEventListener('click', () => {
  location.reload();
});

// Manual send message on click or Enter key
sendButton.addEventListener('click', sendMessage);
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

// Start the timer (only once)
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

// When timer ends, disable input and request final classification
function endChat() {
  messageInput.disabled = true;
  sendButton.disabled = true;
  restartButton.classList.remove('hidden');
  socket.emit('finalizeChat');
}

// Listen for bot messages from the server
socket.on('botMessage', (msg) => {
  addMessage(msg, 'bot');
});

// When final classification is received, show classification input
socket.on('finalClassification', (data) => {
  const { classification, chatId } = data;
  addMessage(classification, 'bot');
  finalAnalysisDiv.textContent = "Final Analysis: " + classification;
  currentChatId = chatId;
  classificationInput.value = "";
  userClassificationDiv.classList.remove('hidden');
});

// Handle submit classification button click
submitClassificationButton.addEventListener('click', () => {
  const actualClassification = classificationInput.value.trim();
  if (actualClassification === "" || currentChatId === null) {
    alert("Please enter a classification.");
    return;
  }
  socket.emit('saveChat', { chatId: currentChatId, actualClassification });
  console.log("Submitted classification:", actualClassification, "for chat ID:", currentChatId);
  // Disable the input after submission
  classificationInput.disabled = true;
  submitClassificationButton.disabled = true;
});
