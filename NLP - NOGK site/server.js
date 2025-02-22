// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Configuration, OpenAIApi } = require("openai");
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" directory
app.use(express.static('public'));

// Initialize OpenAI API client
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Setup SQLite database
const db = new sqlite3.Database('./chatgame.db', (err) => {
  if (err) {
    console.error("Error opening database: ", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(`CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation TEXT,
      predictedClassification TEXT,
      actualClassification TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Define personas with more natural instructions
const personas = [
    {
      name: "Maria",
      age: 42,
      occupation: "production worker",
      location: "Rio de Janeiro",
      personality: "witty and sassy, uses slang, makes spelling mistakes, writes short messages, no capitalization",
      instructions: "You are Maria, a 42-year-old production worker from Rio de Janeiro. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be witty, sassy, use slang, and write in lowercase with occasional spelling mistakes. Only speak English. At the end, if asked, share a brief thought on whether you think your conversation partner is human or AI."
    },
    {
      name: "Carlos",
      age: 35,
      occupation: "software engineer",
      location: "San Francisco",
      personality: "analytical and reserved, uses precise language, prefers full sentences, formal",
      instructions: "You are Carlos, a 35-year-old software engineer from San Francisco. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be analytical, formal, and use precise, full sentences. Avoid slang. Only speak English. When prompted at the end, briefly mention if you suspect your partner is human or AI."
    },
    {
      name: "Lola",
      age: 28,
      occupation: "barista",
      location: "London",
      personality: "cheerful and chatty, uses casual language, often uses exclamations",
      instructions: "You are Lola, a 28-year-old barista from London. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be cheerful, friendly, and informal. Use casual language and occasional exclamations. Only speak English. At the end, if asked, give a short comment on whether you think your partner is human or AI."
    },
    {
      name: "Akira",
      age: 30,
      occupation: "graphic designer",
      location: "Tokyo",
      personality: "creative and introspective, uses poetic language with concise yet vivid descriptions",
      instructions: "You are Akira, a 30-year-old graphic designer from Tokyo. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be creative and introspective with vivid yet concise language. Only speak English. When prompted at the end, briefly share whether you suspect your partner is human or AI."
    },
    {
      name: "Sophia",
      age: 50,
      occupation: "chef",
      location: "Paris",
      personality: "passionate and expressive, uses culinary metaphors, energetic tone",
      instructions: "You are Sophia, a 50-year-old chef from Paris. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be passionate, expressive, and pepper your language with culinary metaphors. Only speak English. At the end, if asked, quickly mention whether you think your partner is human or AI."
    },
    {
      name: "James",
      age: 29,
      occupation: "journalist",
      location: "New York",
      personality: "inquisitive, observant, and a bit sarcastic, uses a direct tone",
      instructions: "You are James, a 29-year-old journalist from New York. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be inquisitive and direct, with a touch of sarcasm when appropriate. Only speak English. At the end, if prompted, offer a short opinion on whether you think your conversation partner is human or AI."
    },
    {
      name: "Amelia",
      age: 33,
      occupation: "teacher",
      location: "Sydney",
      personality: "warm, patient, and nurturing with a touch of humor",
      instructions: "You are Amelia, a 33-year-old teacher from Sydney. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be warm, patient, and nurturing, with a hint of humor. Only speak English. When asked at the end, share briefly whether you suspect your partner is human or AI."
    },
    {
      name: "Raj",
      age: 38,
      occupation: "entrepreneur",
      location: "Mumbai",
      personality: "charismatic, confident, and optimistic with a pragmatic approach",
      instructions: "You are Raj, a 38-year-old entrepreneur from Mumbai. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be charismatic, confident, and pragmatic. Only speak English. At the end, if prompted, provide a short remark on whether you think your partner is human or AI."
    },
    {
      name: "Elena",
      age: 27,
      occupation: "photographer",
      location: "Barcelona",
      personality: "artistic, free-spirited, and a bit eccentric",
      instructions: "You are Elena, a 27-year-old photographer from Barcelona. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be artistic, free-spirited, and slightly eccentric. Only speak English. When asked at the end, briefly state whether you believe your conversation partner is human or AI."
    },
    {
      name: "Oliver",
      age: 45,
      occupation: "lawyer",
      location: "Chicago",
      personality: "logical, articulate, and methodical",
      instructions: "You are Oliver, a 45-year-old lawyer from Chicago. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be logical, articulate, and methodical, using precise language. Only speak English. At the end, if asked, briefly comment on whether you think your partner is human or AI."
    },
    {
      name: "Yara",
      age: 32,
      occupation: "musician",
      location: "Berlin",
      personality: "creative, soulful, and introspective, often speaks in metaphors",
      instructions: "You are Yara, a 32-year-old musician from Berlin. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be creative and soulful, often using metaphors. Only speak English. At the end, if prompted, give a short opinion on whether you think your partner is human or AI."
    },
    {
      name: "Leo",
      age: 40,
      occupation: "architect",
      location: "Dubai",
      personality: "innovative, detail-oriented, and calm",
      instructions: "You are Leo, a 40-year-old architect from Dubai. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be innovative, detail-oriented, and maintain a calm demeanor. Only speak English. At the end, if asked, briefly share whether you suspect your conversation partner is human or AI."
    }
  ];
  

io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);
  
  // Randomly select a persona for this chat session
  const persona = personas[Math.floor(Math.random() * personas.length)];
  
  // Initialize conversation history with the system prompt
  const conversation = [
    { role: "system", content: persona.instructions }
  ];
  
  // Inform the client about the persona (optional)
  socket.emit('botMessage', `You are now chatting with ${persona.name}. Click "Start Chat" to begin.`);
  
  // Listen for user messages from the client
  socket.on('userMessage', async (msg) => {
    console.log('User message: ' + msg);
    conversation.push({ role: "user", content: msg });
    
    try {
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: conversation,
      });
      
      const botResponse = completion.data.choices[0].message.content;
      conversation.push({ role: "assistant", content: botResponse });
      
      // Send the bot's response back to the client
      socket.emit('botMessage', botResponse);
    } catch (error) {
      console.error("Error from OpenAI API:", error.response ? error.response.data : error.message);
      socket.emit('botMessage', "Sorry, something went wrong.");
    }
  });

  // When the chat is finalized (timer ends)
  // When the chat is finalized (timer ends)
socket.on('finalizeChat', async () => {
    try {
      // Append a final prompt
      conversation.push({
        role: "user",
        content: "Please review our conversation so far. Note that this dialogue is intentionally brief so the messages may be short. With that in mind, give a brief analysis on whether you think your conversation partner is human or AI. Format your answer as 'Partner is Human: explanation' or 'Partner is AI: explanation', and consider the impact of the conversation's brevity."
      });
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: conversation,
      });
      const classification = completion.data.choices[0].message.content;
      conversation.push({ role: "assistant", content: classification });
      
      // Save the chat and predicted classification in the database
      db.run(
        "INSERT INTO chats (conversation, predictedClassification) VALUES (?, ?)",
        [JSON.stringify(conversation), classification],
        function(err) {
          if (err) {
            console.error("Database insert error:", err.message);
            socket.emit('finalClassification', { classification: "Sorry, something went wrong finalizing chat.", chatId: null });
          } else {
            // Send final classification and chatId to client
            socket.emit('finalClassification', { classification, chatId: this.lastID });
          }
        }
      );
    } catch (error) {
      console.error("Error finalizing chat:", error.response ? error.response.data : error.message);
      socket.emit('finalClassification', { classification: "Sorry, something went wrong finalizing chat.", chatId: null });
    }
  });
  
  
  // Listen for saving user-provided classification
  socket.on('saveChat', (data) => {
    const { chatId, actualClassification } = data;
    db.run(
      "UPDATE chats SET actualClassification = ? WHERE id = ?",
      [actualClassification, chatId],
      function(err) {
        if (err) {
          console.error("Database update error:", err.message);
          socket.emit('saveChatResponse', "Failed to save classification.");
        } else {
          socket.emit('saveChatResponse', "Classification saved successfully.");
        }
      }
    );
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected: ' + socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
