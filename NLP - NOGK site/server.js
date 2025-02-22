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

// Dummy functions to simulate dynamic data for any location
function getWeatherData(location) {
  // For demonstration, if location contains "Honolulu", use specific data;
  // otherwise return generic dummy data.
  if(location.toLowerCase().includes("honolulu")) {
    return "79F (26C), Wind E at 12 mph (19 km/h), 64% Humidity";
  } else {
    return "72F (22C), Wind N at 10 mph (16 km/h), 60% Humidity";
  }
}

function getTopStories(location) {
    if (location.toLowerCase().includes("honolulu")) {
        return [
            "Elizabeth Holmes Reports to Prison in Texas on Tuesday (29 mins ago)",
            "Debt ceiling deal details: What does the Biden-McCarthy bill include? (1 hour ago)",
            "Russia says drones lightly damage Moscow buildings before dawn ... (53 mins ago)",
            "Rosalynn Carter, wife of 39th US president, has dementia, family says (56 mins ago)",
            "1-year-old among 9 shot after altercation near beach in Hollywood, Florida, authorities say (1 hour ago)",
            "House conservative threatens to push ousting McCarthy over debt ... (2 hours ago)",
            "Another tourist following GPS directions mistakenly drives car into Hawaii harbor (4 hours ago)",
            "Victim describes recent dog attack that injured her, mother on Big Island (16 hours ago)",
            "Pay per wave: Native Hawaiians divided over artificial surf lagoon (13 mins ago)",
            "Monk seal Pualani relocates after weaning from mother (2 hours ago)"
        ];
    } else if (location.toLowerCase().includes("san francisco")) {
        return [
            "Hundreds of S.F. teachers could lose jobs as district readies for worst-case scenario (SF Chronicle, 2 days ago)",
            "Why the giant restaurant behind SF's Ferry Building has sat empty for 12 years (SFGate, 1 day ago)",
            "Bay Area in for a dry spell before likely March showers (SFGate, 2 days ago)",
            "This S.F. affordable housing project is building faster and cheaper apartments. Here's how (SF Chronicle, 3 days ago)",
            "Here's when 70-degree temperatures will return to the Bay Area (SF Chronicle, 1 day ago)"
        ];
    } else if (location.toLowerCase().includes("rio de janeiro")) {
        return [
            "Lady Gaga is set to perform a free concert at Copacabana Beach on May 3, 2025, marking her return to Rio after several years.",
            "Rio de Janeiro recently experienced its hottest day in at least a decade, with temperatures soaring to 44°C.",
            "British journalist Charlotte Peet has been reported missing in Brazil since February 8, 2025, after last being heard from in São Paulo.",
            "Landmarks in Rio de Janeiro, including the Christ the Redeemer statue, were illuminated in orange to honor the memory of the Bibas family.",
            "Brazilian tennis players Rafael Matos and Marcelo Melo advanced to the doubles final at the Rio Open, showcasing exceptional performance."
        ];
    } else if (location.toLowerCase().includes("tokyo")) {
        return [
          "Tokyo plans 4-day working week to boost births (Financial Times, February 22, 2025).",
          "Japan's largest bank apologizes over theft of millions of dollars from safe deposit boxes (AP News, February 22, 2025).",
          "Tokyo hotspot calls time on rowdy New Year's Eve countdown (The Times, February 22, 2025).",
          "Australian man wrongly jailed in Tokyo appeals sentence (News.com.au, February 22, 2025).",
          "Blackstone to acquire Tokyo office building from Seibu in $2.6 billion deal (Reuters, February 22, 2025)."
        ];
    } else if (location.toLowerCase().includes("london")){
        return [
            "We've reached an incredible milestone for the Elizabeth line with 500 million passenger journeys completed. The line has been a game-changer for the city (Mayor of London, Sadiq Khan, February 22, 2025).",
            "Florence Pugh opens Harris Reed show at London Fashion Week (People, February 22, 2025).",
            "More than 500 million passenger journeys have been made on the Elizabeth line in its first two and a half years, making it the single biggest rail success in the UK (London Live, February 22, 2025).",
            "The Elizabeth line in London has reached a landmark with over 500 million passenger journeys having been made in the 2½ years since it opened (RailAdvent, February 22, 2025).",
            "Florence Pugh stuns at London Fashion Week in a black sheer sculptural gown designed by Harris Reed at Tate Britain (Independent Lifestyle, February 22, 2025)."
        ];
    } else {
        return [
            "Local news story 1 (30 mins ago)",
            "Local news story 2 (1 hour ago)",
            "Local news story 3 (45 mins ago)",
            "Local news story 4 (50 mins ago)",
            "Local news story 5 (1 hour ago)",
            "Local news story 6 (1.5 hours ago)",
            "Local news story 7 (2 hours ago)",
            "Local news story 8 (2 hours ago)",
            "Local news story 9 (30 mins ago)",
            "Local news story 10 (2 hours ago)"
        ];
    }
}
  
  function getTopTweets(location) {
    if (location.toLowerCase().includes("honolulu")) {
        return [
            "AIEA UPDATE: All lanes of the H1 east including the right lane after the Waimalu on-ramp OPEN. Stalled OTS off the freeway #hitraffic (Danielle Tucker, 3 hours ago)",
            "Happy memorial day! Here is a look at the weather for the coming week. #hiwx (NWSHonolulu, 21 hours ago)",
            "STORM PREP SAFETY | Officials urge residents to prepare for a weather emergency after NOAA's prediction of an above-normal tropical season. (KITV4, 1 day ago)",
            "BREAKING: Governor Josh Green assisted a woman in need during a Memorial Day ceremony. (Star-Advertiser, 16 hours ago)",
            "Crews to continue underground upgrades on major streets from 6/1 - 6/2 and 6/5 - 6/9. (Hawaiian Electric, 23 hours ago)"
        ];
    } else if (location.toLowerCase().includes("san francisco")) {
        return [
            "Gov. Gavin Newsom wrote to leaders of Congress Friday requesting nearly $40 billion in disaster funding for recovery from the Los Angeles fires (San Francisco Chronicle, February 22, 2025).",
            "SF public school leaders announce 837 layoffs. It's just the beginning (The San Francisco Standard, February 22, 2025).",
            "Official Twitter account of the 5x Super Bowl Champion San Francisco 49ers (San Francisco 49ers, February 22, 2025)."
        ];
    } else if (location.toLowerCase().includes("rio de janeiro")) {
        return [
            "Lasai in Rio de Janeiro is The Best Restaurant in Brazil 2024 (The World's 50 Best, February 22, 2025).",
            "From Lucky Loser to Semifinalist: Camilo Ugo Carabelli battles to defeat Faria and claims a spot in his first ATP Semifinal (José Morgado, February 22, 2025).",
            "In Rio de Janeiro competition, barbers battle for best haircut (Reuters World, February 22, 2025)."
        ];
    } else if (location.toLowerCase().includes("tokyo")) {
        return [
          "Breaking news and features about Japan from the nation's most widely read English-language newspaper (The Japan Times, February 22, 2025).",
          "This is official TokyoTokyo account. We will deliver the 'now' of Tokyo where tradition and innovation intersect. #TokyoTokyo (Tokyo Tokyo, February 22, 2025).",
          "Japan's longest-running English lifestyle magazine Tokyo (Tokyo Weekender, February 22, 2025)."
        ];
    } else if (location.toLowerCase().includes("london")){
        return [
            "The Elizabeth line has become a major success in London's railway infrastructure, accounting for one in seven national rail journeys and achieving 500 million passengers since its opening in May 2022.",
            "Residents in areas with Low Traffic Neighbourhoods (LTNs) have expressed significant dissatisfaction, claiming the schemes lead to longer journey times and hazardous conditions on surrounding busy roads.",
            "Thousands of protesters gathered in London to show support for Ukraine and call for an end to the Russian invasion, marking the three-year anniversary of the conflict.",
            "Florence Pugh kicked off London Fashion Week by modeling a striking black sheer sculptural dress designed by Harris Reed at Tate Britain.",
            "Plans are underway for direct train services from London's St Pancras station to more European countries, including Germany and Switzerland."
        ]
    }
    else {
        return [
            "Tweet 1: Local update (2 hours ago)",
            "Tweet 2: More news coming in (1.5 hours ago)",
            "Tweet 3: Update: Something happened (1 hour ago)",
            "Tweet 4: Breaking: Local event (30 mins ago)",
            "Tweet 5: Traffic update: Expect delays (1 hour ago)"
        ];
    } 
  }  

// Generate dynamic start prompt for any persona using current date/time and dummy data
function generateStartPrompt(persona) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  
  const weather = getWeatherData(persona.location);
  const topStories = getTopStories(persona.location);
  const topTweets = getTopTweets(persona.location);
  
  const formattedTopStories = topStories.map((story, index) => `${index + 1}. ${story}`).join("\n");
  const formattedTopTweets = topTweets.map((tweet, index) => `${index + 1}. ${tweet}`).join("\n");
  
  const startPrompt = 
`Date in ${persona.location}: ${dateStr}.
##
Time in ${persona.location}: ${timeStr}.
##
Weather in ${persona.location}: ${weather}.
##
Top stories in ${persona.location}:
${formattedTopStories}
##
Top tweets in ${persona.location}:
${formattedTopTweets}
##
The following conversation is part of an online game called "Human or Not" by an Israeli company called NOGK Labs. In this game, ${persona.name} tries to understand if they’re chatting with a real person or a bot, while the other user tries to do the same thing. If ${persona.name} comes to the conclusion that they’re talking to a bot, they confront the other user about it.
##
${persona.name} is a ${persona.age} year old ${persona.occupation} from ${persona.location}. ${persona.instructions} Also the message must to be short and you need to act like real person
##
The conversation starts now.`;
  
  return startPrompt;
}

// Define personas (12 personas with location and instructions)
const personas = [
  {
    name: "Maria",
    age: 42,
    occupation: "production worker",
    location: "Rio de Janeiro",
    instructions: "Chat in character: be witty, sassy, use slang, and write in lowercase with occasional spelling mistakes. Only speak English. When prompted, share a brief thought on whether you think your conversation partner is human or AI."
  },
  {
    name: "Carlos",
    age: 35,
    occupation: "software engineer",
    location: "San Francisco",
    instructions: "Chat in character: be analytical, formal, and use precise, full sentences. Avoid slang. Only speak English. When prompted, mention briefly if you suspect your partner is human or AI."
  },
  {
    name: "Lola",
    age: 28,
    occupation: "barista",
    location: "London",
    instructions: "Chat in character: be cheerful, friendly, and informal. Use casual language and occasional exclamations. Only speak English. When prompted, give a short comment on whether you think your partner is human or AI."
  },
  {
    name: "Akira",
    age: 30,
    occupation: "graphic designer",
    location: "Tokyo",
    instructions: "Chat in character: be creative and introspective with vivid yet concise language. Only speak English. When prompted, briefly share whether you suspect your partner is human or AI."
  }
];

io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);
  
  // Randomly select a persona for this chat session
  const persona = personas[Math.floor(Math.random() * personas.length)];
  
  // Generate dynamic start prompt for the selected persona
  const startPrompt = generateStartPrompt(persona);
  
  // Initialize conversation history with the dynamic start prompt
  const conversation = [
    { role: "system", content: startPrompt }
  ];
  
  // Inform the client about the persona (display a message to click "Start Chat")
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
      // Append a final prompt for analysis
      conversation.push({
        role: "user",
        content: "Please review our conversation so far. Note that this dialogue is intentionally brief so the messages may be short. With that in mind, give a brief analysis on whether you think your conversation partner is human or AI. Format your answer as 'Partner is Human: explanation' or 'Partner is AI: explanation', taking the brevity into account."
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
