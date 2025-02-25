(function() {
    console.log("Extension content script loaded");
  
    const chatContainer = document.getElementById("chatMessages");
    const startButton = document.getElementById("startButton");
    const timerElement = document.getElementById("timer");
  
    if (!chatContainer) {
      console.log("Chat container not found.");
      return;
    }
    console.log("Chat container found:", chatContainer);
  
    // List of AI user personas for the extension
    const userPersonas = [
      "You are Alex, a 25-year-old software engineer from New York. Respond casually with short, friendly messages.",
      "You are Sarah, a 30-year-old teacher from London. Your responses are brief and conversational.",
      "You are Tom, a 40-year-old businessman from Berlin. Reply in a concise and genuine manner.",
      "You are Emily, a 22-year-old university student from Toronto. Keep your replies short and natural.",
      "You are Jake, a 35-year-old fitness trainer from Sydney. Answer straightforwardly with brief messages."
    ];
  
    // Select a persistent AI persona for the session
    const selectedPersona = userPersonas[Math.floor(Math.random() * userPersonas.length)];
    console.log("Selected AI user persona:", selectedPersona);
  
    // Get the last partner (bot) message text
    function getLastPartnerMessage() {
      const messages = document.querySelectorAll("#chatMessages .bot");
      if (messages.length > 0) {
        return messages[messages.length - 1].innerText;
      }
      return "";
    }
  
    // Check if timer is still running
    function isTimerRunning() {
      if (timerElement) {
        return parseInt(timerElement.innerText) > 0;
      }
      return false;
    }
  
    // Only click the Start Chat button if it's visible (to avoid restarting timer)
    async function ensureChatIsActive() {
      return new Promise((resolve) => {
        if (startButton && startButton.offsetParent !== null && !startButton.disabled) {
          console.log("Clicking 'Start Chat' button...");
          startButton.click();
          setTimeout(resolve, 2000);
        } else {
          resolve();
        }
      });
    }
  
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          console.log("Extension: New node added to chat container");
          chrome.storage.local.get("active", async (result) => {
            const isActive = (result.active === true);
            console.log("Extension: Auto-reply active state:", isActive);
            if (isActive && isTimerRunning()) {
              const messageText = getLastPartnerMessage();
              console.log("Extension: Last partner message:", messageText);
              if (messageText) {
                await ensureChatIsActive();
                const delay = Math.floor(Math.random() * (20000 - 5000 + 1)) + 5000;
                console.log("Extension: Setting reply timeout with delay (ms):", delay);
                setTimeout(() => {
                  if (!isTimerRunning()) {
                    console.log("Extension: Timer expired, not sending reply.");
                    return;
                  }
                  chrome.runtime.sendMessage({
                    type: "generateReply",
                    currentMessage: messageText,
                    persona: selectedPersona
                  }, (response) => {
                    if (response && response.reply) {
                      console.log("Extension: Received auto-reply:", response.reply);
                      const input = document.getElementById("messageInput");
                      if (input) {
                        input.disabled = false;
                        // Set the reply directly (without simulating typing)
                        input.value = response.reply;
                        console.log("Extension: Reply set directly in input.");
                        // Simulate Enter keypress to send message
                        const enterEvent = new KeyboardEvent("keydown", {
                          bubbles: true,
                          cancelable: true,
                          key: "Enter",
                          code: "Enter"
                        });
                        setTimeout(() => {
                          console.log("Extension: Simulating Enter keypress to send message.");
                          input.dispatchEvent(enterEvent);
                        }, 500);
                      } else {
                        console.log("Extension: Input field not found.");
                      }
                    } else {
                      console.log("Extension: No reply received from background.");
                    }
                  });
                }, delay);
              }
            }
          });
        }
      });
    });
  
    observer.observe(chatContainer, { childList: true, subtree: true });
  })();
  