let promptBarElement: HTMLElement | null = null;
let activeEditableElement: HTMLElement | null = null; // The DOM element that was active when the prompt bar was triggered
let promptInputElement: HTMLDivElement | null = null; // The contentEditable div for user input in the prompt bar
let promptDropdownElement: HTMLElement | null = null; // The dropdown for quick prompts
let isLoading = false; // Tracks if an API request is in progress
let currentOriginalPrompt: string | null = null; // Stores the user's typed prompt for regeneration/tone change
let currentActiveSelectionContextForRequest: string | null = null; // Stores the selected text context used for the last API request

// State related to the text selection in the host page
let activeSelectionContext: string | null = null; // Text content of the user's current selection on the page
let activeSelectionRange: Range | null = null;    // The Range object of the selection in a contentEditable element
let activeSelectionStart: number | null = null; // Selection start offset for input/textarea
let activeSelectionEnd: number | null = null;   // Selection end offset for input/textarea


enum UIState {
  HIDDEN,
  PROMPT, // Waiting for user to type a prompt
  LOADING, // API call in progress
  RESULT  // Displaying API result
}
let currentUiState: UIState = UIState.HIDDEN;

// DOM Element IDs and constants
const PROMPT_BAR_CONTAINER_ID = 'extension-prompt-bar';
const PROMPT_INPUT_ID = 'extension-prompt-input';
const PROMPT_DROPDOWN_ID = 'extension-prompt-dropdown';
const PROMPT_BAR_OFFSET = 10; // Offset for positioning the prompt bar from the selection

// SVG Icons - Inlined for simplicity and to avoid external requests or packaging complexities
const LOGO_IMG = `<img src="https://chikkiai.vercel.app/chikki.png" alt="Logo" style="width: 22px; height: 22px; object-fit: contain;">`;
const CHEVRON_DOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-up"><path d="m18 15-6-6-6 6"/></svg>`;
const PLUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;
const SEND_UP_ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-icon lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`;
const REGENERATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-cw-icon lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`;
const CHANGE_TONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings2-icon lucide-settings-2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>`;
const COPY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

const FONT_FAMILY_SYSTEM = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`; // Standard system font stack

/**
 * Injects global CSS styles required by the extension's UI elements.
 * Ensures styles are added only once.
 */
function injectGlobalStyles(): void {
  if (document.getElementById('extension-global-styles')) return;
  const styleSheet = document.createElement("style");
  styleSheet.id = 'extension-global-styles';
  styleSheet.textContent = `
    .skeleton-line { /* Styles for loading skeleton */
      background-color: #e0e0e0;
      border-radius: 4px;
      height: 12px;
      margin-bottom: 8px;
      animation: pulse 1.5s infinite ease-in-out;
      position: relative;
      overflow: hidden;
    }
    .skeleton-line::after { /* Shimmer effect for skeleton */
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
      animation: shimmer 2s infinite;
    }
    .skeleton-line.short { width: 60%; }
    .skeleton-line.medium { width: 80%; }
    .skeleton-line.long { width: 100%; }

    @keyframes pulse {
      0% { background-color: #e0e0e0; }
      50% { background-color: #f0f0f0; }
      100% { background-color: #e0e0e0; }
    }
    
    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 200%; }
    }
    
    .extension-icon-button { /* Base style for icon buttons */
        background: transparent;
        border: none;
        padding: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #52525b; 
    }
    .extension-icon-button:hover {
        color: #18181b; 
    }
    
    .copy-button-text { /* For "Copied!" text animation */
      transition: opacity 0.2s ease-in-out;
    }
    
    .extension-insert-button { /* Style for the main "Insert" button */
        background-color: #292524; 
        color: white;
        border: none;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 13px;
        cursor: pointer;
        margin-left: auto; 
    }
    .extension-insert-button:hover {
        background-color: #52525b; 
    }
    .prompt-dropdown-item { /* Style for items in the quick prompt dropdown */
        padding: 10px 14px; 
        cursor: pointer;
        border-bottom: 1px solid #f3f4f6; 
        font-size: 13px;
        color: #374151; 
        transition: background-color 0.15s ease-in-out; 
    }
    .prompt-dropdown-item:last-child {
        border-bottom: none; 
    }
    .prompt-dropdown-item:hover {
        background-color: #f9fafb; 
        color: #1f2937; 
    }
  `;
  document.head.appendChild(styleSheet);
}

/**
 * Initializes the main prompt bar element if it doesn't exist,
 * or ensures it's rendered if it was previously hidden or empty.
 */
function initializePromptBar(): void {
  injectGlobalStyles();

  if (document.getElementById(PROMPT_BAR_CONTAINER_ID)) {
    promptBarElement = document.getElementById(PROMPT_BAR_CONTAINER_ID);
    // If bar exists but is empty or was hidden, re-render its initial state.
    if (promptBarElement && (!promptBarElement.innerHTML.trim() || currentUiState === UIState.HIDDEN)) {
        renderPromptState(); 
    }
  } else {
    promptBarElement = document.createElement('div');
    promptBarElement.setAttribute('id', PROMPT_BAR_CONTAINER_ID);
    Object.assign(promptBarElement.style, {
      position: 'absolute', 
      zIndex: '2147483646', // High z-index to appear on top of most page elements
      backgroundColor: 'white', 
      border: '4px solid #e5e7eb',
      borderRadius: '16px', 
      padding: '0px', // Padding will be handled by inner content
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      display: 'none', // Initially hidden
      alignItems: 'center', 
      fontFamily: FONT_FAMILY_SYSTEM, 
      gap: '0px', 
      width: '450px', // Fixed width for the prompt bar
      overflow: 'hidden', // Prevents content from spilling out
    });
    document.body.appendChild(promptBarElement);
    renderPromptState(); // Render the initial prompt UI
  }

  createPromptDropdown(); // Ensure the dropdown is also created/available
}

/**
 * Creates or retrieves the prompt dropdown element.
 * Attaches necessary event listeners for keyboard navigation.
 */
function createPromptDropdown(): void {
    if (document.getElementById(PROMPT_DROPDOWN_ID)) {
        promptDropdownElement = document.getElementById(PROMPT_DROPDOWN_ID);
        // Ensure keydown listener is attached if element is re-retrieved
        if (promptDropdownElement && !promptDropdownElement.dataset.keydownListenerAttached) {
            promptDropdownElement.addEventListener('keydown', handlePromptDropdownKeyNavigation);
            promptDropdownElement.dataset.keydownListenerAttached = 'true';
        }
        return; 
    }
    promptDropdownElement = document.createElement('div');
    promptDropdownElement.setAttribute('id', PROMPT_DROPDOWN_ID);
    Object.assign(promptDropdownElement.style, {
        position: 'absolute', // Positioned relative to the prompt bar toggle button
        zIndex: '2147483647', // Higher than the prompt bar itself
        backgroundColor: 'white',
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
        maxHeight: '200px', 
        overflowY: 'auto',
        display: 'none', // Initially hidden
        fontSize: '13px', 
        minWidth: '220px', 
        fontFamily: FONT_FAMILY_SYSTEM,
    });
    
    // Predefined quick prompts
    promptDropdownElement.innerHTML = `
      <div class="prompt-dropdown-item" tabindex="0">Improve writing & fix grammar</div>
      <div class="prompt-dropdown-item" tabindex="0">Make more concise</div>
      <div class="prompt-dropdown-item" tabindex="0">Expand with details</div>
      <div class="prompt-dropdown-item" tabindex="0">Rephrase professionally</div>
      <div class="prompt-dropdown-item" tabindex="0">Add compelling examples</div>
      <div class="prompt-dropdown-item" tabindex="0">Create transition sentence</div>
      <div class="prompt-dropdown-item" tabindex="0">Make more persuasive</div>
      <div class="prompt-dropdown-item" tabindex="0">Continue writing from here</div>
    `;
    document.body.appendChild(promptDropdownElement);

    // Handles click on a dropdown item to populate the prompt input
    promptDropdownElement.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('prompt-dropdown-item')) {
            if (promptInputElement) {
                promptInputElement.textContent = target.textContent;
                // Focus and move cursor to the end of the input
                const range = document.createRange();
                const sel = window.getSelection();
                if (sel) {
                    range.selectNodeContents(promptInputElement);
                    range.collapse(false); // false to collapse to end
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                promptInputElement.focus();
            }
            if (promptDropdownElement) {
                promptDropdownElement.style.display = 'none'; // Hide dropdown
                const toggleButton = document.getElementById('prompt-dropdown-toggle-btn');
                if (toggleButton) { // Update toggle button icon
                    toggleButton.innerHTML = `Quick prompts ${CHEVRON_DOWN_SVG}`; 
                }
            }
        }
    });
    promptDropdownElement.addEventListener('keydown', handlePromptDropdownKeyNavigation);
    promptDropdownElement.dataset.keydownListenerAttached = 'true'; // Mark listener as attached
}

/**
 * Renders the UI for the initial prompt input state.
 * @param initialPromptText Optional text to prefill the prompt input.
 */
function renderPromptState(initialPromptText: string = ""): void {
  if (!promptBarElement) return;
  // Ensure dropdown exists, crucial if this is called before full initialization
  if (!promptDropdownElement || !document.body.contains(promptDropdownElement)) {
      createPromptDropdown();
  }

  currentUiState = UIState.PROMPT;
  isLoading = false;
  const chevronIcon = CHEVRON_DOWN_SVG; 

  promptBarElement.innerHTML = `
    <div style="display: flex; flex-direction: column; width: 100%; gap: 10px; padding: 8px 10px;">
      <div style="flex-grow: 1; position: relative;">
        <div id="${PROMPT_INPUT_ID}" contenteditable="true" class="prompt-input-editable" style="width: 100%; min-height: 40px; padding: 6px; font-size: 14px; color: #374151; outline: none; line-height: 1.5; border-bottom: 1px solid #f0f0f0;">${initialPromptText}</div>
        <style> /* Scoped styles for placeholder text in contentEditable */
          .prompt-input-editable:empty:before {
            content: "Suggest changes ..."; /* Placeholder text */
            color: #9ca3af;
            position: absolute;
            pointer-events: none; /* Allows clicks to pass through to the div */
          }
          .prompt-input-editable:focus:before {
            display: none; /* Hide placeholder on focus */
          }
        </style>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${LOGO_IMG}
          <div style="position: relative;"> 
            <button id="prompt-dropdown-toggle-btn" title="Quick Prompts" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer; color: #374151;">
              Quick prompts ${chevronIcon}
            </button>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
        <span style="font-size: 11px; color: #9ca3af;">Press ESC to close</span>
          <button id="prompt-plus-btn" title="Add selected page text to prompt" class="extension-icon-button" style="background: transparent; border: none; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center;">
            ${PLUS_SVG}
          </button>
          <button id="prompt-send-btn" title="Send" style="background-color: #292524; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${SEND_UP_ARROW_SVG}
          </button>
        </div>
      </div>
    </div>
  `;
  promptInputElement = document.getElementById(PROMPT_INPUT_ID) as HTMLDivElement;
  attachPromptBarButtonListeners();
}

/**
 * Renders the UI for the loading state (e.g., while waiting for API response).
 */
function renderLoadingState(): void {
  if (!promptBarElement) return;
  currentUiState = UIState.LOADING;
  isLoading = true;
  promptBarElement.innerHTML = `
    <div style="padding: 16px 20px; display: flex; flex-direction: column; align-items: center; width: 100%;">
      <div style="font-size: 14px; color: #374151; margin-bottom: 16px; text-align: center;">Generating Magic...</div>
      <div class="skeleton-line long" style="width: 90%; margin-left: auto; margin-right: auto;"></div>
      <div class="skeleton-line medium" style="width: 70%; margin-left: auto; margin-right: auto;"></div>
      <div class="skeleton-line short" style="width: 50%; margin-left: auto; margin-right: auto;"></div>
    </div>
  `;
  if (promptBarElement.style.display === 'none') { // Ensure bar is visible
      promptBarElement.style.display = 'flex';
  }
}

/**
 * Renders the UI to display the result from the API.
 * @param _originalUserPrompt The user's original prompt (used for context, not directly displayed here).
 * @param generatedText The text generated by the API.
 */
function renderResultState(_originalUserPrompt: string, generatedText: string): void {
  if (!promptBarElement) return;
  currentUiState = UIState.RESULT;
  isLoading = false;
  const processedText = generatedText.replace(/\n/g, '<br>'); // Convert newlines to <br> for HTML display

  promptBarElement.innerHTML = `
    <div style="padding: 12px 15px; width: 100%; display: flex; flex-direction: column; gap: 10px; max-height: 180px;">
      <div style="font-size: 14px; color: #374151; line-height: 1.6; overflow-y: auto; white-space: normal; flex: 1; max-height: 120px;">${processedText}</div>
      <div style="display: flex; gap: 8px; align-items:center; margin-top: 10px; border-top: 1px solid #f0f0f0; padding-top: 10px; flex-shrink: 0;">
        <button id="result-change-tone-btn" title="Change Tone" class="extension-icon-button">
          ${CHANGE_TONE_SVG}
        </button>
        <button id="result-regenerate-btn" title="Regenerate" class="extension-icon-button">
          ${REGENERATE_SVG}
        </button>
        <button id="result-copy-btn" title="Copy Text" class="extension-icon-button" style="margin-left: auto;">
          ${COPY_SVG}
        </button>
        <button id="result-insert-btn" class="extension-insert-button" style="margin-left: 8px;">Insert</button>
      </div>
    </div>
  `;
   if (promptBarElement.style.display === 'none') { // Ensure bar is visible
      promptBarElement.style.display = 'flex';
  }
  attachResultBarButtonListeners(generatedText); // Attach listeners for result actions
}

/**
 * Attaches event listeners to buttons available in the initial prompt state.
 */
function attachPromptBarButtonListeners(): void {
  document.getElementById('prompt-send-btn')?.addEventListener('click', () => handleSendPrompt());
  promptInputElement?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { // Send on Enter (but not Shift+Enter)
      event.preventDefault();
      handleSendPrompt();
    }
  });
  document.getElementById('prompt-dropdown-toggle-btn')?.addEventListener('click', togglePromptDropdown);
  
  const plusButton = document.getElementById('prompt-plus-btn');
  if (plusButton) {
    plusButton.addEventListener('click', () => {
      // Appends currently selected page text (or last captured selection context) to the prompt input.
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (promptInputElement && selectedText) {
        promptInputElement.textContent = (promptInputElement.textContent + " " + selectedText).trim();
        // Focus and move cursor to end
        const range = document.createRange();
        const sel = window.getSelection();
        if (sel) {
            range.selectNodeContents(promptInputElement);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        promptInputElement.focus();
      } else if (promptInputElement && activeSelectionContext) { // Fallback to last captured selection
         promptInputElement.textContent = (promptInputElement.textContent + " " + activeSelectionContext).trim();
         const range = document.createRange();
         const sel = window.getSelection();
          if (sel) {
              range.selectNodeContents(promptInputElement);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
          }
         promptInputElement.focus();
      }
    });
  }
}

/**
 * Helper function to insert text into an HTMLInputElement or HTMLTextAreaElement.
 * Replaces the current selection or inserts at the cursor position.
 * @param element The target input or textarea element.
 * @param text The text to insert.
 * @param start The original selection start offset (if available).
 * @param end The original selection end offset (if available).
 */
function insertIntoInputOrTextarea(
    element: HTMLInputElement | HTMLTextAreaElement,
    text: string,
    start: number | null,
    end: number | null
): void {
    const currentVal = element.value;
    let selectionStart = start;
    let selectionEnd = end;

    // Fallback to current element's selection if precise start/end were not captured or are invalid
    if (selectionStart === null || selectionStart < 0 || selectionStart > currentVal.length) {
        selectionStart = element.selectionStart !== null ? element.selectionStart : currentVal.length;
    }
    if (selectionEnd === null || selectionEnd < 0 || selectionEnd > currentVal.length) {
        selectionEnd = element.selectionEnd !== null ? element.selectionEnd : currentVal.length;
    }
    // Ensure start is not after end
    if (selectionStart > selectionEnd) {
        selectionStart = selectionEnd;
    }
    
    element.value = currentVal.substring(0, selectionStart) + text + currentVal.substring(selectionEnd);
    element.focus();
    const newCursorPos = selectionStart + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos); // Move cursor after inserted text
    // Dispatch an input event to ensure any listeners on the page react to the change
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
}

/**
 * Helper function to insert text into a contentEditable HTMLElement.
 * Attempts to use a paste event for better compatibility with rich text editors,
 * falling back to direct DOM manipulation if needed.
 * @param element The target contentEditable element.
 * @param text The text to insert.
 * @param explicitRange The Range object captured when the UI was initially shown (preferred).
 * @returns True if insertion was attempted, false otherwise.
 */
function insertIntoContentEditable(
    element: HTMLElement,
    text: string,
    explicitRange: Range | null // The range explicitly captured when the UI was shown
): boolean {
    element.focus(); // Ensure element is focused
    const selection = window.getSelection();
    if (!selection) {
        console.warn('[insertIntoContentEditable] No window selection available.');
        return false;
    }

    let targetRange: Range;

    // Determine the target range: use explicitRange if valid, otherwise fallback to current selection or element bounds.
    if (explicitRange && 
        (element.contains(explicitRange.commonAncestorContainer) || element === explicitRange.commonAncestorContainer)) {
        targetRange = explicitRange.cloneRange(); // Clone to avoid modifying the original
    } else {
        if (explicitRange) {
            console.warn('[insertIntoContentEditable] explicitRange was invalid or outside target element. Falling back to current selection.');
        }
        if (selection.rangeCount > 0) {
            const currentRange = selection.getRangeAt(0);
            // Use current selection only if it's within the target element
            if (element.contains(currentRange.commonAncestorContainer) || element === currentRange.commonAncestorContainer) {
                targetRange = currentRange.cloneRange();
            } else {
                console.warn('[insertIntoContentEditable] Current selection is outside target. Creating range at the end of target.');
                targetRange = document.createRange();
                targetRange.selectNodeContents(element);
                targetRange.collapse(false); // Collapse to the end
            }
        } else {
            console.warn('[insertIntoContentEditable] No current selection. Creating range at the start of target.');
            targetRange = document.createRange();
            targetRange.selectNodeContents(element);
            targetRange.collapse(true); // Collapse to the start
        }
    }
    
    // Apply the determined target range to the selection for subsequent operations
    selection.removeAllRanges();
    selection.addRange(targetRange);

    let insertedSuccessfully = false;

    // Method 1: document.execCommand('insertText')
    // This is often the most robust for contentEditable as it mimics user input.
    if (element.isContentEditable) {
        try {
            // document.execCommand acts on the current selection (which we've just set)
            insertedSuccessfully = document.execCommand('insertText', false, text);
            if (insertedSuccessfully) {
                console.log('[insertIntoContentEditable] Inserted via document.execCommand("insertText").');
            } else {
                console.warn('[insertIntoContentEditable] document.execCommand("insertText") returned false. Trying next method.');
            }
        } catch (e) {
            console.warn('[insertIntoContentEditable] document.execCommand("insertText") threw an error. Trying next method.', e);
            insertedSuccessfully = false;
        }
    }

    // Method 2: Simulated Paste Event (if execCommand failed or wasn't applicable/successful)
    if (!insertedSuccessfully && element.isContentEditable) {
        console.log('[insertIntoContentEditable] Trying simulated paste event.');
        try {
            // Re-apply range just in case execCommand modified it undesirably without succeeding
            const freshTargetRangeForPaste = targetRange.cloneRange();
            selection.removeAllRanges();
            selection.addRange(freshTargetRangeForPaste);

            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', text);
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true,
            });
            element.dispatchEvent(pasteEvent);

            if (pasteEvent.defaultPrevented) {
                console.log('[insertIntoContentEditable] Inserted via paste event (defaultPrevented).');
                insertedSuccessfully = true;
            } else {
                // Heuristic: Check if text appears. This is imperfect.
                if (element.textContent?.includes(text) || element.innerHTML?.includes(text)) {
                    console.log('[insertIntoContentEditable] Inserted via paste event (text found).');
                    insertedSuccessfully = true;
                } else {
                    console.warn('[insertIntoContentEditable] Paste event not defaultPrevented and text not found in element. Trying next method.');
                }
            }
        } catch (e) {
            console.warn('[insertIntoContentEditable] Paste event dispatch failed. Trying next method.', e);
            insertedSuccessfully = false;
        }
    }

    // Method 3: Direct DOM Manipulation (Last Resort Fallback)
    if (!insertedSuccessfully) {
        console.log('[insertIntoContentEditable] Trying direct DOM manipulation.');
        try {
            // Re-apply range for direct manipulation
            const freshTargetRangeForDOM = targetRange.cloneRange();
            selection.removeAllRanges();
            selection.addRange(freshTargetRangeForDOM);

            freshTargetRangeForDOM.deleteContents(); // Delete selected content (if any)
            const textNode = document.createTextNode(text);
            freshTargetRangeForDOM.insertNode(textNode);
            
            // Move cursor after inserted text
            const newRange = document.createRange();
            newRange.setStartAfter(textNode);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            insertedSuccessfully = true;
            console.log('[insertIntoContentEditable] Inserted via direct DOM manipulation.');

            // Dispatch an input event as direct DOM manipulation might not be caught by some editors
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            console.log('[insertIntoContentEditable] Dispatched input event after direct DOM manipulation.');
        } catch (e) {
            console.error('[insertIntoContentEditable] Direct DOM manipulation failed.', e);
            insertedSuccessfully = false;
        }
    }

    if (insertedSuccessfully) {
        element.focus(); // Ensure focus remains
    } else {
        console.error('[insertIntoContentEditable] All insertion methods failed for element:', element);
    }

    return insertedSuccessfully;
}

/**
 * Attaches event listeners to buttons available in the result display state (Insert, Copy, etc.).
 * @param generatedTextToInsert The text that was generated and can be inserted/copied.
 */
function attachResultBarButtonListeners(generatedTextToInsert: string): void {
  document.getElementById('result-insert-btn')?.addEventListener('click', () => {
    if (activeEditableElement) {
        const plainText = generatedTextToInsert.replace(/<br\s*\/?>/gi, '\n'); // Convert <br> back to newlines for insertion
        const currentHostname = window.location.hostname;

        // Domain-specific insertion logic
        if (currentHostname === 'twitter.com' || currentHostname === 'x.com') {
            if (activeEditableElement.isContentEditable) {
                // Twitter's composer is a contentEditable div. Use the range captured when UI was shown.
                insertIntoContentEditable(activeEditableElement, plainText, activeSelectionRange);
            } else if (activeEditableElement instanceof HTMLInputElement || activeEditableElement instanceof HTMLTextAreaElement) {
                insertIntoInputOrTextarea(activeEditableElement, plainText, activeSelectionStart, activeSelectionEnd);
            } else {
                console.warn('[InsertButton] Twitter/X.com: Active element is not a recognized editable type.', activeEditableElement);
            }
        } else { 
            // Generic logic for other domains
            if (activeEditableElement instanceof HTMLInputElement || activeEditableElement instanceof HTMLTextAreaElement) {
                 insertIntoInputOrTextarea(activeEditableElement, plainText, activeSelectionStart, activeSelectionEnd);
            } else if (activeEditableElement.isContentEditable) {
                // Use activeSelectionRange if available (captured during UI display).
                // insertIntoContentEditable will fallback if it's null.
                insertIntoContentEditable(activeEditableElement, plainText, activeSelectionRange);
            } else {
                console.warn('[InsertButton] Generic: Active element is not a recognized editable type.', activeEditableElement);
            }
        }
    } else {
        console.warn('[InsertButton] activeEditableElement is null. Cannot insert.');
    }
    hidePromptBar();
  });

  document.getElementById('result-copy-btn')?.addEventListener('click', async () => {
    const plainText = generatedTextToInsert.replace(/<br\s*\/?>/gi, '\n'); // Ensure plain text for clipboard
    try {
      await navigator.clipboard.writeText(plainText);
      const copyButton = document.getElementById('result-copy-btn');
      if (copyButton) { // Visual feedback for copy action
        const originalContent = copyButton.innerHTML;
        const originalWidth = copyButton.offsetWidth; // Preserve width to prevent layout shift
        
        copyButton.innerHTML = `<div style="min-width: ${originalWidth}px; display: flex; align-items: center; justify-content: center;">
          <span class="copy-button-text" style="opacity: 0;">Copied!</span>
        </div>`;
        
        void copyButton.offsetWidth; // Force reflow for transition
        
        const textSpan = copyButton.querySelector('.copy-button-text') as HTMLElement;
        if (textSpan) textSpan.style.opacity = '1'; // Fade in "Copied!"
        
        setTimeout(() => {
          if (textSpan) textSpan.style.opacity = '0'; // Fade out "Copied!"
          setTimeout(() => { // Restore original button content after fade out
            copyButton.innerHTML = originalContent;
          }, 200); // Duration of opacity transition
        }, 1300); // How long "Copied!" stays visible
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  });

  document.getElementById('result-regenerate-btn')?.addEventListener('click', () => {
    // Uses the original prompt and selection context to request a new generation.
    if (currentOriginalPrompt || currentActiveSelectionContextForRequest) {
        let promptBasis = currentOriginalPrompt || ""; 
        let regenSystemPrompt = `Regenerate the response for the user prompt: "${promptBasis}".`;
        if (currentActiveSelectionContextForRequest) {
            regenSystemPrompt = `Regarding the selected text: "${currentActiveSelectionContextForRequest}". Regenerate the response for the user prompt: "${promptBasis}".`;
        }
        // Include a snippet of the previous response to guide the regeneration.
        const previousResponseSnippet = generatedTextToInsert.length > 150 ? generatedTextToInsert.substring(0, 147) + "..." : generatedTextToInsert;
        const fullRegenSystemPrompt = `${regenSystemPrompt} The previous unsatisfactory response was: "${previousResponseSnippet}"`;
        
        handleSendPrompt(fullRegenSystemPrompt); // Send with the modified system prompt
    } else {
        renderPromptState(); // Fallback to initial prompt state if context is lost
    }
  });

  document.getElementById('result-change-tone-btn')?.addEventListener('click', () => {
      // Prepares a prompt to ask the model to change the tone of the previous response.
      if (currentOriginalPrompt || currentActiveSelectionContextForRequest) {
          const previousResponseSnippet = generatedTextToInsert.length > 50 ? generatedTextToInsert.substring(0, 47) + "..." : generatedTextToInsert;
          let toneChangeBasePrompt = `Change tone of: "${previousResponseSnippet}"`;
          if (currentOriginalPrompt) {
            toneChangeBasePrompt += ` (Original user prompt: "${currentOriginalPrompt}")`;
          }
          if (currentActiveSelectionContextForRequest) {
            toneChangeBasePrompt += ` (Original selected text context: "${currentActiveSelectionContextForRequest.substring(0,50)}...")`;
          }
          renderPromptState(toneChangeBasePrompt); // Go back to prompt state with prefilled input
      }
  });
}

/**
 * Toggles the visibility of the quick prompt dropdown menu.
 * Positions the dropdown relative to its toggle button.
 */
function togglePromptDropdown(): void {
  if (!promptDropdownElement) { // Ensure dropdown is created
      createPromptDropdown(); 
      if (!promptDropdownElement) return; 
  }

  const button = document.getElementById('prompt-dropdown-toggle-btn');
  if (!button) return;

  const isCurrentlyHidden = promptDropdownElement.style.display === 'none' || !promptDropdownElement.style.display;

  if (isCurrentlyHidden) {
    const buttonRect = button.getBoundingClientRect(); // Get button position for placing dropdown
    
    promptDropdownElement.style.display = 'block'; // Show dropdown to measure its dimensions
    const dropdownHeight = promptDropdownElement.offsetHeight;
    const dropdownWidth = promptDropdownElement.offsetWidth;

    // Default position: below the button
    let topPosition = buttonRect.bottom + window.scrollY + 4; 
    let leftPosition = buttonRect.left + window.scrollX;

    // Adjust if dropdown goes off-screen horizontally
    if (leftPosition + dropdownWidth > window.innerWidth + window.scrollX - PROMPT_BAR_OFFSET) {
        leftPosition = window.innerWidth + window.scrollX - dropdownWidth - PROMPT_BAR_OFFSET;
    }
    if (leftPosition < window.scrollX + PROMPT_BAR_OFFSET) {
        leftPosition = window.scrollX + PROMPT_BAR_OFFSET;
    }

    // Adjust if dropdown goes off-screen vertically (try to place above if it overflows below)
    const overflowsBelow = (buttonRect.bottom + dropdownHeight + 4) > window.innerHeight;
    const enoughSpaceAbove = (buttonRect.top - dropdownHeight - 4) > 0;

    if (overflowsBelow && enoughSpaceAbove) { // Place above button
      topPosition = buttonRect.top + window.scrollY - dropdownHeight - 4; 
    }
    
    promptDropdownElement.style.top = `${topPosition}px`;
    promptDropdownElement.style.left = `${leftPosition}px`;
    button.innerHTML = `Quick prompts ${CHEVRON_UP_SVG}`; // Update button icon

    const firstItem = promptDropdownElement.querySelector('.prompt-dropdown-item') as HTMLElement | null;
    firstItem?.focus();
    
  } else { // Hide dropdown
    promptDropdownElement.style.display = 'none';
    button.innerHTML = `Quick prompts ${CHEVRON_DOWN_SVG}`; // Update button icon
  }
}

/**
 * Handles sending the prompt to the background script for processing.
 * @param promptOverride Optional prompt text to use instead of the input field's content (e.g., for regeneration).
 */
async function handleSendPrompt(promptOverride?: string): Promise<void> {
  let textFromInput: string | undefined | null = null;
  let finalPromptToSend: string | undefined | null = null;

  if (promptOverride) { // Used for regeneration or tone change
    finalPromptToSend = promptOverride;
  } else { // Standard prompt submission
    textFromInput = promptInputElement?.textContent?.trim();
    currentOriginalPrompt = textFromInput || ""; // Store for potential later use (regen/tone)
    currentActiveSelectionContextForRequest = activeSelectionContext; // Store selection for regen/tone

    if (!currentOriginalPrompt && !currentActiveSelectionContextForRequest) {
      if (isLoading) return; // Avoid multiple submissions
      // console.log("Prompt input and page selection are empty. Not sending."); // Debugging, remove for prod
      return; // Do nothing if both prompt and selection are empty
    }

    // Construct the prompt based on whether there's selected text and/or a typed command
    if (currentActiveSelectionContextForRequest && currentOriginalPrompt) {
      finalPromptToSend = `Selected text: "${currentActiveSelectionContextForRequest}". User command: "${currentOriginalPrompt}"`;
    } else if (currentActiveSelectionContextForRequest) { // Only selected text, imply a default action or use it as context
      finalPromptToSend = `Selected text: "${currentActiveSelectionContextForRequest}".`; 
    } else { // Only a typed command
      finalPromptToSend = currentOriginalPrompt; 
    }
  }

  if (isLoading || !finalPromptToSend) return; // Prevent sending if already loading or no prompt
  
  renderLoadingState(); // Switch UI to loading

  try {
    // Send message to background script to generate text
    const response: any = await chrome.runtime.sendMessage({ type: "GENERATE_TEXT", prompt: finalPromptToSend });
    if (response && response.success && response.data) {
      renderResultState(currentOriginalPrompt || "", response.data); 
    } else {
      console.error("Error from background script or invalid response:", response?.error);
      renderResultState(currentOriginalPrompt || "", `Error: ${response?.error || 'Failed to get response.'}`);
    }
  } catch (error) {
    console.error("Error sending message to background script:", error);
    renderResultState(currentOriginalPrompt || "", `Error: ${error instanceof Error ? error.message : 'Communication failure.'}`);
  }
}

/**
 * Displays the prompt bar UI, positioned near the target element or selection.
 * Captures selection context for later use (insertion, API request).
 * @param targetElement The editable element that triggered the UI.
 * @param selectionRange The Range object of the current text selection (if any).
 * @param showEmptyForAltH If true, shows an empty prompt bar (typically for Alt+H invocation without selection).
 */
function displayPromptBarUI(targetElement: HTMLElement, selectionRange?: Range | null, showEmptyForAltH: boolean = false): void {
  if (!promptBarElement) initializePromptBar(); // Ensure UI is initialized
  if (!promptBarElement) return;


  if (currentUiState === UIState.LOADING) return; // Don't interfere if already loading

  const previousActiveSelectionContext = activeSelectionContext;
  // Reset selection state for this new invocation
  activeSelectionContext = null;
  activeSelectionRange = null;
  activeSelectionStart = null;
  activeSelectionEnd = null;

  let textToRenderInPromptInput = ""; // Text to prefill in the prompt bar's input
  const currentWindowSelection = window.getSelection();

  if (!showEmptyForAltH && selectionRange && currentWindowSelection && currentWindowSelection.toString().trim().length > 0) {
    // Case: UI triggered by text selection
    const newlySelectedText = currentWindowSelection.toString().trim();
    activeSelectionContext = newlySelectedText; // Store selected text for API context
    // Don't prefill prompt input with selected text; user will type a command for it.
    
    // Capture selection details for precise insertion later
    if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
      activeSelectionStart = targetElement.selectionStart;
      activeSelectionEnd = targetElement.selectionEnd;
    } else if (targetElement.isContentEditable) {
      activeSelectionRange = selectionRange.cloneRange(); // Store the Range object
    }
  } else if (showEmptyForAltH) {
    // Case: UI triggered by Alt+H (or similar, without prior text selection)
    // activeSelectionContext remains null as no text is pre-selected for the prompt.
    
    // Capture current cursor position for insertion, even if no text is selected
    if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
      activeSelectionStart = targetElement.selectionStart; // Cursor position
      activeSelectionEnd = targetElement.selectionStart;   // Collapse selection to cursor
    } else if (targetElement.isContentEditable && currentWindowSelection && currentWindowSelection.rangeCount > 0) {
      const currentRange = currentWindowSelection.getRangeAt(0);
      // Ensure the current selection/cursor is within the target contentEditable
      if (targetElement.contains(currentRange.commonAncestorContainer) || targetElement === currentRange.commonAncestorContainer) {
        activeSelectionRange = currentRange.cloneRange();
      } else {
        // Fallback: if selection is outside, create a range at the start of the target element
        activeSelectionRange = document.createRange();
        activeSelectionRange.selectNodeContents(targetElement);
        activeSelectionRange.collapse(true); // Collapse to the start
        console.warn('[displayPromptBarUI] Alt+H: Current selection outside target contentEditable. Defaulting to start of element.');
      }
    } else if (targetElement.isContentEditable) {
        // Further fallback for contentEditable if no selection info is available (e.g., empty editor just focused)
        activeSelectionRange = document.createRange();
        activeSelectionRange.selectNodeContents(targetElement);
        activeSelectionRange.collapse(true); // Default to start
        console.warn('[displayPromptBarUI] Alt+H: No selection in target contentEditable. Defaulting to start of element.');
    }
  }
  
  // Re-render prompt state if it's a new context, or if bar was hidden/in a different state.
  if (showEmptyForAltH || (activeSelectionContext && activeSelectionContext !== previousActiveSelectionContext) || currentUiState !== UIState.PROMPT || promptBarElement.style.display === 'none') {
    renderPromptState(textToRenderInPromptInput);
  }

  promptBarElement.style.display = 'flex'; // Make the bar visible

  // --- Positioning Logic ---
  // Get bounding rectangle of the selection or the target element
  const rect = selectionRange && !showEmptyForAltH ? selectionRange.getBoundingClientRect() : targetElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const barWidth = promptBarElement.offsetWidth || 450; // Use actual or default width
  const barHeight = promptBarElement.offsetHeight || 100; // Use actual or default height

  // Default position: above and centered on the selection/element
  let topPosition = rect.top + scrollTop - barHeight - PROMPT_BAR_OFFSET;
  let leftPosition = rect.left + scrollLeft + (rect.width / 2) - (barWidth / 2);

  // Adjust if it goes off-screen (prefer below if it overflows above)
  if (topPosition < scrollTop + PROMPT_BAR_OFFSET) { 
      topPosition = rect.bottom + scrollTop + PROMPT_BAR_OFFSET;
  }
  // If it still overflows (e.g. selection at bottom of screen), try above again, but ensure not off-top
  if (topPosition + barHeight > scrollTop + window.innerHeight - PROMPT_BAR_OFFSET) {
      topPosition = rect.top + scrollTop - barHeight - PROMPT_BAR_OFFSET; 
      if (topPosition < scrollTop + PROMPT_BAR_OFFSET) topPosition = scrollTop + PROMPT_BAR_OFFSET; 
  }
  // Horizontal adjustments
  if (leftPosition < scrollLeft + PROMPT_BAR_OFFSET) {
      leftPosition = scrollLeft + PROMPT_BAR_OFFSET;
  }
  if (leftPosition + barWidth > scrollLeft + window.innerWidth - PROMPT_BAR_OFFSET) {
      leftPosition = scrollLeft + window.innerWidth - barWidth - PROMPT_BAR_OFFSET;
  }
   // Final check for left boundary after right adjustment
  if (leftPosition < scrollLeft + PROMPT_BAR_OFFSET) { leftPosition = scrollLeft + PROMPT_BAR_OFFSET; }


  promptBarElement.style.top = `${topPosition}px`;
  promptBarElement.style.left = `${leftPosition}px`;

  // Fallback positioning: if calculated position is still out of view, center it fixed.
  if (isPositionOutOfView(promptBarElement)) {
    console.warn("[displayPromptBarUI] Calculated position is out of view. Using fixed centered fallback.");
    promptBarElement.style.position = 'fixed';
    promptBarElement.style.top = '50%';
    promptBarElement.style.left = '50%';
    promptBarElement.style.transform = 'translate(-50%, -50%)';
  } else {
    promptBarElement.style.position = 'absolute'; // Ensure it's absolute if not fixed
    promptBarElement.style.transform = ''; // Clear any previous transform
  }

  // Manage event listeners on the editable element
  if (activeEditableElement && activeEditableElement !== targetElement) {
    activeEditableElement.removeEventListener('blur', handleInputBlur as EventListener);
    activeEditableElement.removeEventListener('input', handleInputChange);
  }
  activeEditableElement = targetElement; // Update the currently tracked editable element
  activeEditableElement.addEventListener('blur', handleInputBlur as EventListener);
  activeEditableElement.addEventListener('input', handleInputChange);

  // If shown via Alt+H (empty prompt), focus the input field.
  if (promptInputElement && showEmptyForAltH) {
        promptInputElement.focus();
        // Place cursor at the beginning of the (empty) prompt input
        const range = document.createRange();
        const sel = window.getSelection();
        if (sel) {
            range.selectNodeContents(promptInputElement);
            range.collapse(true); // true to collapse to start
            sel.removeAllRanges();
            sel.addRange(range);
        }
  }
}

/**
 * Checks if the given element is completely out of the viewport.
 * @param element The HTMLElement to check.
 * @returns True if the element is out of view, false otherwise.
 */
function isPositionOutOfView(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth
  );
}

/**
 * Hides the prompt bar and resets associated state.
 */
function hidePromptBar(): void {
  if (promptBarElement) {
    promptBarElement.style.display = 'none';
  }
  if (promptDropdownElement) { // Also hide the dropdown if it's open
    promptDropdownElement.style.display = 'none';
    const toggleButton = document.getElementById('prompt-dropdown-toggle-btn');
    // Reset dropdown toggle button icon if it's part of the main prompt bar
    if (toggleButton && promptBarElement && promptBarElement.contains(toggleButton)) {
        toggleButton.innerHTML = `Quick prompts ${CHEVRON_DOWN_SVG}`;
    }
  }
  currentUiState = UIState.HIDDEN;

  // Clear selection context as it's no longer relevant
  activeSelectionContext = null;
  activeSelectionRange = null;
  activeSelectionStart = null;
  activeSelectionEnd = null;
}

/**
 * Handles input changes in the original editable element.
 * Hides the prompt bar if not in a loading state, as the context might have changed.
 */
function handleInputChange(): void {
  if (currentUiState !== UIState.LOADING) { 
    hidePromptBar();
  }
}

/**
 * Handles blur events on the original editable element.
 * Hides the prompt bar if focus moves outside the extension's UI.
 * @param event The FocusEvent.
 */
function handleInputBlur(event: FocusEvent): void {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  // Check if focus moved to an element within the prompt bar or dropdown
  const isFocusWithinPromptBar = promptBarElement && 
                                (relatedTarget === promptBarElement || 
                                 promptBarElement.contains(relatedTarget) || 
                                 relatedTarget?.closest(`#${PROMPT_BAR_CONTAINER_ID}`) ||
                                 (promptDropdownElement && promptDropdownElement.contains(relatedTarget)));


  if (isFocusWithinPromptBar) {
    return; // Don't hide if focus is still within our UI
  }

  // Use a small timeout to allow focus to settle. If focus hasn't moved to our UI, hide.
  // This handles cases like clicking outside, tabbing away, etc.
  setTimeout(() => {
    const activeElementIsStillOurUI = document.activeElement && 
                                     promptBarElement &&
                                     (document.activeElement === promptBarElement || 
                                      promptBarElement.contains(document.activeElement) || 
                                      document.activeElement.closest(`#${PROMPT_BAR_CONTAINER_ID}`) ||
                                      (promptDropdownElement && promptDropdownElement.contains(document.activeElement)));
    if (!activeElementIsStillOurUI && currentUiState !== UIState.LOADING) {
        hidePromptBar();
    }
  }, 150); 
}

/**
 * Handles text selection events (mouseup) to trigger the prompt bar.
 */
function handleTextSelection(): void {
  if (currentUiState === UIState.LOADING) return; // Don't trigger if already loading

  const currentActiveElement = document.activeElement as HTMLElement | null;
  const selection = window.getSelection();

  if (
    currentActiveElement && // An element must be active
    ( // It must be an editable type
        currentActiveElement instanceof HTMLInputElement ||
        currentActiveElement instanceof HTMLTextAreaElement ||
        currentActiveElement.isContentEditable
    ) &&
    selection &&
    selection.toString().trim().length > 0 && // Some text must be selected
    selection.rangeCount > 0 // Must have a valid range
  ) {
    const range = selection.getRangeAt(0);
    // Ensure the selection is actually within the active element (not, e.g., in the browser's URL bar)
    if (currentActiveElement.contains(range.commonAncestorContainer) || currentActiveElement === range.commonAncestorContainer) {
      displayPromptBarUI(currentActiveElement, range);
    }
  }
}

// --- Global Event Listeners ---

document.addEventListener('mouseup', handleTextSelection); // For text selection trigger

document.addEventListener('keyup', (event: KeyboardEvent) => {
  // Ignore modifier key releases
  if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) return; 
  
  if (event.key === "Escape") { // Escape key hides the prompt bar
      hidePromptBar();
      if (isLoading) { // If it was loading, reset to prompt state
          isLoading = false; // This should ideally be handled by a cancel mechanism if API call is abortable
          renderPromptState(); 
      }
  }
});

document.addEventListener('keydown', (event: KeyboardEvent) => {
    // Alt+H shortcut to toggle prompt bar visibility
    if (event.altKey && (event.key.toLowerCase() === 'h')) { 
        event.preventDefault(); // Prevent default browser behavior for Alt+H (e.g., history menu in some browsers)

        if (currentUiState !== UIState.HIDDEN) { // If bar is visible, hide it
            hidePromptBar();
            return; 
        }

        // If bar is hidden, try to show it for the currently active editable element
        const currentActiveElement = document.activeElement as HTMLElement | null;
        if (
            currentActiveElement &&
            (currentActiveElement instanceof HTMLInputElement ||
             currentActiveElement instanceof HTMLTextAreaElement ||
             currentActiveElement.isContentEditable)
        ) {
            // `true` for showEmptyForAltH: shows bar at cursor, even without text selection
            displayPromptBarUI(currentActiveElement, null, true); 
        }
    }
});

// Initialize when the document is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializePromptBar();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initializePromptBar();
  });
}

/**
 * Handles keyboard navigation (ArrowUp, ArrowDown, Enter, Space, Escape) within the prompt dropdown.
 * @param event The KeyboardEvent.
 */
function handlePromptDropdownKeyNavigation(event: KeyboardEvent): void {
    if (!promptDropdownElement || promptDropdownElement.style.display === 'none') return;

    const items = Array.from(promptDropdownElement.querySelectorAll('.prompt-dropdown-item')) as HTMLElement[];
    if (!items.length) return;

    let currentIndex = items.findIndex(item => item === document.activeElement || item.contains(document.activeElement as Node));

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        currentIndex = (currentIndex + 1) % items.length;
        items[currentIndex].focus();
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        items[currentIndex].focus();
    } else if (event.key === 'Enter' || event.key === ' ') { // Select item
        event.preventDefault();
        if (currentIndex > -1 && items[currentIndex]) {
            items[currentIndex].click(); 
        } else if (items.length > 0 && currentIndex === -1) { // If no item focused, click first
            items[0].click();
        }
    } else if (event.key === 'Escape') { // Close dropdown on Escape
        event.preventDefault();
        const toggleButton = document.getElementById('prompt-dropdown-toggle-btn');
        if (promptDropdownElement) promptDropdownElement.style.display = 'none';
        if (toggleButton) {
            toggleButton.innerHTML = `Quick prompts ${CHEVRON_DOWN_SVG}`; 
            toggleButton.focus(); // Return focus to the toggle button
        }
    }
}

/**
 * Global click listener to close the prompt dropdown if a click occurs outside of it or its toggle button.
 */
document.addEventListener('click', function(event) {
    if (promptDropdownElement && promptDropdownElement.style.display !== 'none') {
        const toggleButton = document.getElementById('prompt-dropdown-toggle-btn');
        const isClickInsideDropdown = promptDropdownElement.contains(event.target as Node);
        const isClickOnToggleButton = toggleButton && toggleButton.contains(event.target as Node);

        if (!isClickInsideDropdown && !isClickOnToggleButton) { // Click was outside
            promptDropdownElement.style.display = 'none';
            if (toggleButton) {
                toggleButton.innerHTML = `Quick prompts ${CHEVRON_DOWN_SVG}`;
            }
        }
    }
});

/**
 * Repositions the prompt bar on window resize if it's visible.
 */
window.addEventListener('resize', () => {
  if (promptBarElement && promptBarElement.style.display !== 'none' && activeEditableElement) {
    // Attempt to get the current selection range within the active element.
    // This helps if the user has moved the cursor/selection since the bar first appeared.
    let currentRangeForResize: Range | null = null;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        const selRange = selection.getRangeAt(0);
        // Ensure the selection is still within the known active editable element
        if (activeEditableElement.contains(selRange.commonAncestorContainer) || activeEditableElement === selRange.commonAncestorContainer) {
             currentRangeForResize = selRange;
        }
    }
    // Reposition based on the original `activeSelectionRange` (if available and still relevant)
    // or the `currentRangeForResize`. The `displayPromptBarUI` function handles nulls.
    // The `showEmptyForAltH` parameter is false here, as we are repositioning an existing bar,
    // not triggering a new one via Alt+H.
    displayPromptBarUI(activeEditableElement, activeSelectionRange || currentRangeForResize, false);
  }
});
