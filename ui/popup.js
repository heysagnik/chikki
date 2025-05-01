// ui/popup.js

// --- DOM Elements ---
const getSelectionBtn = document.getElementById('get-selection-btn');
const selectedTextArea = document.getElementById('selected-text');
const fixGrammarBtn = document.getElementById('fix-grammar-btn');
const rewriteBtn = document.getElementById('rewrite-btn');
const resultTextArea = document.getElementById('result-text');
const copyResultBtn = document.getElementById('copy-result-btn');
const statusMessage = document.getElementById('status-message');
// Add other elements if needed (e.g., toneSelect, changeToneBtn)

// --- Utility Functions ---
function setStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`; // Add type class (e.g., 'error', 'loading')
}

function enableActionButtons(enable) {
    fixGrammarBtn.disabled = !enable;
    rewriteBtn.disabled = !enable;
    // Enable/disable other action buttons here
}

function enableCopyButton(enable) {
    copyResultBtn.disabled = !enable;
}

// --- Core Logic ---

// Function to request selected text from the content script
function requestSelectedText() {
    setStatus('Getting selection...', 'loading');
    selectedTextArea.value = ''; // Clear previous selection
    resultTextArea.value = ''; // Clear previous result
    enableActionButtons(false);
    enableCopyButton(false);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0 || !tabs[0].id) {
            setStatus('Could not find active tab.', 'error');
            return;
        }
        const activeTabId = tabs[0].id;

        // Send message to content script in the active tab
        chrome.tabs.sendMessage(
            activeTabId,
            { action: "getSelectedText" }, // Define this action in content-script.js
            (response) => {
                if (chrome.runtime.lastError) {
                    // Handle cases where content script isn't injected or doesn't respond
                    console.error("Error getting selection:", chrome.runtime.lastError.message);
                    setStatus('Could not get selection. Try reloading the page.', 'error');
                    selectedTextArea.value = ''; // Ensure it's clear
                } else if (response && response.selectedText) {
                    selectedTextArea.value = response.selectedText;
                    setStatus('Selection retrieved.', 'info');
                    enableActionButtons(true); // Enable actions now that we have text
                } else {
                    setStatus('No text selected on the page.', 'info');
                    selectedTextArea.value = ''; // Ensure it's clear
                }
            }
        );
    });
}

// Function to send action request to background script
function performAIAction(actionType, text) {
     if (!text) {
        setStatus('No text selected to perform action.', 'error');
        return;
    }

    setStatus('Processing request...', 'loading');
    resultTextArea.value = ''; // Clear previous result
    enableActionButtons(false); // Disable buttons during processing
    enableCopyButton(false);

    // Construct the message based on the action type
    const message = {
        action: `performAiAction_${actionType}`, // e.g., performAiAction_fixGrammar
        data: {
            text: text
            // Add other data if needed, e.g., tone: toneSelect.value
        }
    };

    // Send message to the background script (service worker)
    chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error sending message to background:", chrome.runtime.lastError.message);
            setStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
            enableActionButtons(true); // Re-enable buttons on error
            return;
        }

        if (response && response.success && response.data) {
            resultTextArea.value = response.data;
            setStatus('Action completed successfully.', 'info');
            enableCopyButton(true); // Enable copy button
        } else {
            console.error("AI action failed:", response?.error);
            setStatus(`Error: ${response?.error || 'Unknown error from background'}`, 'error');
            resultTextArea.value = ''; // Clear result area on error
        }
        // Re-enable buttons after processing (success or failure)
        enableActionButtons(true);
    });
}

// Function to copy result text
function copyResultToClipboard() {
    if (!resultTextArea.value) return;

    navigator.clipboard.writeText(resultTextArea.value)
        .then(() => {
            setStatus('Result copied to clipboard!', 'info');
            // Optionally change button text temporarily
            copyResultBtn.textContent = 'Copied!';
            setTimeout(() => {
                 copyResultBtn.textContent = 'Copy Result';
            }, 1500);
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            setStatus('Failed to copy result.', 'error');
        });
}


// --- Event Listeners ---
getSelectionBtn.addEventListener('click', requestSelectedText);

fixGrammarBtn.addEventListener('click', () => {
    performAIAction('fixGrammar', selectedTextArea.value);
});

rewriteBtn.addEventListener('click', () => {
    performAIAction('rewrite', selectedTextArea.value);
});

copyResultBtn.addEventListener('click', copyResultToClipboard);

// --- Initialization ---
// Automatically try to get selection when popup opens
document.addEventListener('DOMContentLoaded', requestSelectedText);