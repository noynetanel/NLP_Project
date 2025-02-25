chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "generateReply") {
      console.log("Received request to generate reply for:", request.currentMessage);
      console.log("Using persona:", request.persona);
    
      const messages = [
        { role: "system", content: request.persona },
        { role: "user", content: `Reply to: ${request.currentMessage}` }
      ];
    
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer "
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: messages,
          temperature: 0.7
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.choices && data.choices.length > 0) {
          const reply = data.choices[0].message.content;
          console.log("Generated reply:", reply);
          sendResponse({ reply: reply });
        } else {
          console.error("Unexpected API response:", data);
          sendResponse({ reply: "Error: Unexpected API response." });
        }
      })
      .catch(error => {
        console.error("Error calling OpenAI API:", error);
        sendResponse({ reply: "Error: Unable to generate reply." });
      });
    
      return true;
    }
  });
  
  