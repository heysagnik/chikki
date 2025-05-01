import { callBackendApi } from './backend-api.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'generate') {
    callBackendApi(message.prompt)
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // keep channel open for async response
  }
});