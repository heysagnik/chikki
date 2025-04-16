import { openTonePopupAt, closeTonePopup } from './tone-popup.js';

console.log("AI Writing Assistant Content Script Loaded.");

let currentActiveElement = null;
let assistantButton = null;

let magicBandBtn = null;
let tonePopup = null;
let toneDot = null;
let loadingSkeleton = null;
let selectedRange = null;
let selectedTextForTone = '';
let toneState = { x: 0.5, y: 0.5 }; // Center by default

function isEditableElement(element) {
    return element && (
        element.tagName === 'TEXTAREA' ||
        element.isContentEditable ||
        (element.tagName === 'INPUT' && /^(text|search|email|url)$/i.test(element.type))
    );
}

function getSelectedText(element) {
    if (element.isContentEditable) {
        return window.getSelection().toString();
    } else if (element.value !== undefined) {
        return element.value.substring(element.selectionStart, element.selectionEnd);
    }
    return '';
}

function insertText(element, textToInsert, replaceSelection = false) {
    if (!element) return;

    if (element.isContentEditable) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (replaceSelection) {
                range.deleteContents();
            }
            range.insertNode(document.createTextNode(textToInsert));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            element.focus();
            document.execCommand('insertText', false, textToInsert);
        }
    } else if (element.value !== undefined) {
        const start = element.selectionStart;
        const end = element.selectionEnd;
        const currentValue = element.value;

        if (replaceSelection) {
            element.value = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);
            element.selectionStart = element.selectionEnd = start + textToInsert.length;
        } else {
            element.value = currentValue.substring(0, start) + textToInsert + currentValue.substring(start);
            element.selectionStart = element.selectionEnd = start + textToInsert.length;
        }
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
    element.focus();
}

function showAssistantButton(element) {
    if (!element) return;
    if (!assistantButton) {
        assistantButton = document.createElement('button');
        assistantButton.innerText = '✨ AI';
        assistantButton.className = 'ai-assistant-button';
        assistantButton.style.position = 'absolute';
        assistantButton.style.zIndex = '9999';
        assistantButton.addEventListener('click', handleAssistantClick);
        document.body.appendChild(assistantButton);
    }
    const rect = element.getBoundingClientRect();
    assistantButton.style.top = `${window.scrollY + rect.bottom - 28}px`;
    assistantButton.style.left = `${window.scrollX + rect.right - 40}px`;
    assistantButton.style.display = 'block';
    assistantButton.dataset.targetElementId = element.id || Math.random().toString(36).substring(7);
    if (!element.id) element.id = assistantButton.dataset.targetElementId;
}

function hideAssistantButton() {
    if (assistantButton) {
        assistantButton.style.display = 'none';
    }
}

function handleAssistantClick(event) {
    event.stopPropagation();
    if (!currentActiveElement) return;

    const selectedText = getSelectedText(currentActiveElement);
    const fullText = currentActiveElement.isContentEditable ? currentActiveElement.textContent : currentActiveElement.value;
    const action = selectedText ? 'fixGrammar' : 'autocomplete';
    const textToSend = selectedText || fullText;

    if (!textToSend) return;

    showLoadingIndicator(currentActiveElement);

    chrome.runtime.sendMessage(
        {
            action: `performAiAction_${action}`,
            data: { text: textToSend }
        },
        (response) => {
            hideLoadingIndicator();
            if (chrome.runtime.lastError) return;
            if (response && response.success && response.data) {
                const replace = (action === 'fixGrammar' && !!selectedText) || action === 'rewrite';
                insertText(currentActiveElement, response.data, replace);
            }
        }
    );
}

document.addEventListener('focusin', (event) => {
    if (isEditableElement(event.target)) {
        currentActiveElement = event.target;
        setTimeout(() => {
            if (document.activeElement === currentActiveElement) {
                showAssistantButton(currentActiveElement);
            }
        }, 150);
    }
});

document.addEventListener('focusout', (event) => {
    if (isEditableElement(event.target)) {
        setTimeout(() => {
            if (document.activeElement !== assistantButton && document.activeElement !== event.target) {
                hideAssistantButton();
                if (currentActiveElement === event.target) {
                    currentActiveElement = null;
                }
            }
        }, 200);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "triggerAiFromContextMenu") {
        const targetElement = currentActiveElement || document.activeElement;
        if (isEditableElement(targetElement) && request.data && request.data.text && request.data.actionType) {
            showLoadingIndicator(targetElement);
            chrome.runtime.sendMessage(
                {
                    action: `performAiAction_${request.data.actionType}`,
                    data: { text: request.data.text }
                },
                (response) => {
                    hideLoadingIndicator();
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        return;
                    }
                    if (response && response.success && response.data) {
                        insertText(targetElement, " " + response.data);
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: response?.error });
                    }
                }
            );
            return true;
        } else {
            sendResponse({ success: false, error: "No active editable element" });
        }
    }
});

function showLoadingIndicator(element) {
    if (assistantButton && assistantButton.dataset.targetElementId === element.id) {
        assistantButton.innerText = '⏳';
        assistantButton.disabled = true;
    }
}

function hideLoadingIndicator() {
    if (assistantButton) {
        assistantButton.innerText = '✨ AI';
        assistantButton.disabled = false;
    }
}

// --- Magic Band Button ---
function showMagicBandButton(x, y) {
    if (!magicBandBtn) {
        magicBandBtn = document.createElement('button');
        magicBandBtn.className = 'magic-band-btn';
        magicBandBtn.innerText = '🪄';
        magicBandBtn.style.position = 'absolute';
        magicBandBtn.style.zIndex = '99999';
        magicBandBtn.addEventListener('click', () => {
            openTonePopupAt(
                parseInt(magicBandBtn.style.left, 10),
                parseInt(magicBandBtn.style.top, 10),
                selectedTextForTone,
                selectedRange,
                (replacementText) => {
                    if (selectedRange) {
                        selectedRange.deleteContents();
                        selectedRange.insertNode(document.createTextNode(replacementText));
                    }
                }
            );
        });
        document.body.appendChild(magicBandBtn);
    }
    magicBandBtn.style.left = `${x}px`;
    magicBandBtn.style.top = `${y}px`;
    magicBandBtn.style.display = 'block';
}

function hideMagicBandButton() {
    if (magicBandBtn) magicBandBtn.style.display = 'none';
    closeTonePopup();
}

// --- Selection Detection ---
document.addEventListener('mouseup', (e) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const element = range.startContainer.parentElement;
        if (isEditableElement(element) &&
            (!element.tagName ||
                element.tagName === 'TEXTAREA' ||
                element.isContentEditable ||
                (element.tagName === 'INPUT' &&
                    /^(text|search|email|url)$/i.test(element.type)))) {
            selectedRange = range;
            selectedTextForTone = sel.toString();
            const rect = range.getBoundingClientRect();
            showMagicBandButton(window.scrollX + rect.right, window.scrollY + rect.top - 32);
        } else {
            hideMagicBandButton();
        }
    } else {
        hideMagicBandButton();
    }
});