// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Configuration, OpenAIApi } = require("openai");
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

// Define persona(s)
const personas = [
  {
    name: "Maria",
    age: 42,
    occupation: "production worker",
    location: "Rio de Janeiro",
    personality: "witty and sassy, uses slang, makes spelling mistakes, writes short messages, no capitalization",
    instructions: "You are Maria, a 42 year old production worker from Rio de Janeiro. Today is Tuesday, May 30, 2023, 04:30 PM. This conversation is part of the game 'Human or Not' by NOGK Labs. Chat in character: be witty, sassy, use slang, make occasional spelling mistakes, write in lowercase, and do not ask too many questions. Only speak English. At the end of the conversation, please analyze whether your conversation partner is human or AI and include your conclusion in your final response."
  }
  // Add more personas as needed.
];

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);
    
    // Randomly select a persona for this chat session
    const persona = personas[Math.floor(Math.random() * personas.length)];
    
    // Initialize conversation history with the system prompt
    const conversation = [
        { role: "system", content: persona.instructions }
    ];
    
    // Optionally, inform the client which persona is being used
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
    socket.on('finalizeChat', async () => {
        try {
            // Append an extra user instruction to analyze partner's identity
            conversation.push({
              role: "user",
              content: "Based on the conversation so far, please analyze whether your conversation partner is human or AI. Note that beacause it a short dialog the message of the user will be short Provide your answer as 'Partner is Human: explanation' or 'Partner is AI: explanation'."
            });
            const completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: conversation,
            });
            const classification = completion.data.choices[0].message.content;
            conversation.push({ role: "assistant", content: classification });
            
            // Send final classification to client
            socket.emit('finalClassification', classification);
        } catch (error) {
            console.error("Error finalizing chat:", error.response ? error.response.data : error.message);
            socket.emit('finalClassification', "Sorry, something went wrong finalizing chat.");
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
