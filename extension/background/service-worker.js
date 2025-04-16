// background/service-worker.js
import { callBackendApi } from './backend-api.js';
import { buildPrompt } from './prompt-builder.js';

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action && request.action.startsWith("performAiAction_")) {
        (async () => {
            const actionType = request.action.replace("performAiAction_", "");
            const prompt = buildPrompt(actionType, request.data);

            if (!prompt) {
                sendResponse({ success: false, error: "Invalid action type or data for prompt generation." });
                return;
            }

            try {
                const result = await callBackendApi(prompt);
                sendResponse({ success: true, data: result });
            } catch (error) {
                sendResponse({ success: false, error: error?.message || "Failed to call backend API" });
            }
        })();
        return true;
    } else if (request.action === "getSettings") {
        sendResponse({ success: true, data: { info: "No user settings available." } });
    }
});

// Context Menu Setup
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "aiAssistRewrite",
        title: "AI Assist: Rewrite Selection",
        contexts: ["selection"]
    });
    chrome.contextMenus.create({
        id: "aiAssistExplain",
        title: "AI Assist: Explain Selection",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId.startsWith("aiAssist") && info.selectionText && tab?.id) {
        let actionType = "";
        if (info.menuItemId === "aiAssistRewrite") actionType = "rewrite";
        if (info.menuItemId === "aiAssistExplain") actionType = "explain";

        if (actionType) {
            chrome.tabs.sendMessage(tab.id, {
                action: "triggerAiFromContextMenu",
                data: {
                    text: info.selectionText,
                    actionType
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    // Optionally log error in production if needed
                }
            });
        }
    }
});

console.log("AI Writing Assistant Service Worker (Backend Connected) started.");