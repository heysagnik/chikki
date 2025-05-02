export class ApiService {
  constructor() {}
  
  async fetchGeneratedText(selectedText, prompt) {
    try {
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

      const [apiResult] = await Promise.all([
        new Promise((resolve, reject) => {
          if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
            reject(new Error("Chrome runtime API is not available"));
            return;
          }
          
          chrome.runtime.sendMessage(
            {
              type: 'generate',
              prompt: `Context: "${selectedText || ''}"\nRequest: "${prompt}"`
            },
            response => {
              if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message || "Chrome runtime error occurred"));
              }
              
              if (!response) {
                return reject(new Error("Empty response from background script"));
              } 
              
              if (response.error) {
                return reject(new Error(response.error));
              }
              
              if (response.data !== undefined) {
                resolve(response.data);
              } else {
                reject(new Error("Invalid response format from background script"));
              }
            }
          );
        }),
        delay(900) // Minimum delay to show loading state
      ]);

      return apiResult;
    } catch (error) {
      console.error("Error fetching generated text:", error);
      throw error;
    }
  }
  
  async fetchRegeneratedText(selectedText, currentPrompt, previousResult) {
    try {
      const regenerationPrompt = `Regenerate this: ${currentPrompt}\nPrevious result: ${previousResult || ""}`;
      return await this.fetchGeneratedText(selectedText, regenerationPrompt);
    } catch (error) {
      console.error("Error fetching regenerated text:", error);
      throw error;
    }
  }
}

export default ApiService;