document.getElementById("start").addEventListener("click", () => {
    chrome.storage.local.set({ active: true }, () => {
      console.log("Auto-reply started");
    });
  });
  
  document.getElementById("stop").addEventListener("click", () => {
    chrome.storage.local.set({ active: false }, () => {
      console.log("Auto-reply stopped");
    });
  });
  