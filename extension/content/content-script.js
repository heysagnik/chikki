class Chikki {
  constructor() {
    this.selectedText = '';
    this.currentSelection = null;
    this.currentRange = null;
    this.generatedText = '';
    this.isLoading = false;
    this.hasTextSelection = false; // Add this new property
    this.init();
  }

  init() {
    this.createUIElements();
    this.setupEventListeners();
  }

  createUIElements() {
    this.setupContainer();
    this.setupEditIcon();
    this.setupPromptContainer();
    this.setupResultContainer();
  }

  setupContainer() {
    this.container = document.getElementById('chikki-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'chikki-container';
      this.container.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';
      document.body.appendChild(this.container);
    }
  }

  setupEditIcon() {
    this.editIcon = document.createElement('div');
    this.editIcon.id = 'chikki-edit-icon';
    this.editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="16px" height="16px"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
    this.editIcon.style.display = 'none';
    this.editIcon.setAttribute('role', 'button');
    this.editIcon.setAttribute('aria-label', 'Edit selected text');
    this.container.appendChild(this.editIcon);
  }

  setupPromptContainer() {
    this.promptContainer = document.createElement('div');
    this.promptContainer.id = 'chikki-prompt-container';
    this.promptContainer.style.display = 'none';

    this.promptInput = document.createElement('input');
    this.promptInput.id = 'chikki-prompt-input';
    this.promptInput.type = 'text';
    this.promptInput.placeholder = 'Enter your instructions and press Enter...';
    this.promptInput.setAttribute('aria-label', 'Prompt input');
    this.promptContainer.appendChild(this.promptInput);
    
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.id = 'chikki-loading';
    this.loadingIndicator.textContent = '  Generating magic...';
    this.loadingIndicator.style.display = 'none';
    this.promptContainer.appendChild(this.loadingIndicator);

    this.setupSkeletonLoader();
    this.container.appendChild(this.promptContainer);
  }

  setupSkeletonLoader() {
    this.skeletonContainer = document.createElement('div');
    this.skeletonContainer.id = 'chikki-skeleton-container';
    this.skeletonContainer.style.display = 'none';
    
    for (let i = 0; i < 5; i++) {
      const skeletonLine = document.createElement('div');
      skeletonLine.className = 'chikki-skeleton-line';
      this.skeletonContainer.appendChild(skeletonLine);
    }
    this.promptContainer.appendChild(this.skeletonContainer);
  }

  setupResultContainer() {
    this.resultContainer = document.createElement('div');
    this.resultContainer.id = 'chikki-result-container';
    this.resultContainer.style.display = 'block';

    this.generatedContent = document.createElement('div');
    this.generatedContent.id = 'chikki-generated-content';
    this.resultContainer.appendChild(this.generatedContent);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'chikki-button-container';
    
    this.regenerateButton = document.createElement('button');
    this.regenerateButton.id = 'chikki-regenerate-button';
    this.regenerateButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg><span>Regenerate</span>`;
    this.regenerateButton.setAttribute('aria-label', 'Regenerate text');
    
    this.replaceButton = document.createElement('button');
    this.replaceButton.id = 'chikki-replace-button';
    this.replaceButton.textContent = this.hasTextSelection ? 'Replace' : 'Insert';
    this.replaceButton.setAttribute('aria-label', 
      this.hasTextSelection ? 
      'Replace selection with generated text' : 
      'Insert generated text at cursor position');
    
    buttonContainer.appendChild(this.regenerateButton);
    buttonContainer.appendChild(this.replaceButton);
    this.resultContainer.appendChild(buttonContainer);
    
    this.container.appendChild(this.resultContainer);
  }

  setupEventListeners() {
    document.addEventListener('mouseup', this.handleTextSelection.bind(this), true);
    
    let selectionTimeout;
    document.addEventListener('selectionchange', () => {
      clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(() => this.handleSelectionChange(), 150);
    });

    this.editIcon.addEventListener('click', this.handleEditIconClick.bind(this));
    this.promptInput.addEventListener('keydown', this.handlePromptInputKeydown.bind(this));
    this.replaceButton.addEventListener('click', this.handleReplaceButtonClick.bind(this));
    this.regenerateButton.addEventListener('click', this.handleRegenerateButtonClick.bind(this));
    document.addEventListener('mousedown', this.handleClickOutside.bind(this), true);
  }

  handleSelectionChange() {
    if (this.editIcon.style.display === 'none' && 
        !this.promptContainer.classList.contains('active') && 
        !this.resultContainer.classList.contains('active')) {
      this.handleTextSelection();
    }
  }

  handleTextSelection(event) {
    if (event && this.isClickInsideComponent(event)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      // Check for selection first
      if (selectedText && selection.rangeCount > 0) {
        this.hasTextSelection = true; // Flag that we have an actual text selection
        if (this.shouldUpdateSelection(selectedText)) {
          this.updateSelectionData(selectedText, selection);
        }
      } else {
        // Check if cursor is in an input or textarea
        const activeElement = document.activeElement;
        const isInputField = activeElement.tagName === 'INPUT' || 
                            activeElement.tagName === 'TEXTAREA' || 
                            activeElement.isContentEditable;
        
        if (isInputField) {
          this.hasTextSelection = false; // Flag that we only have cursor placement
          // Handle cursor in text field with no selection
          this.handleCursorInTextField(activeElement);
        } else {
          this.clearSelectionIfNeeded();
        }
      }
      
      // Update replace/insert button text if it exists
      this.updateReplaceButtonText();
    }, 50);
  }

  updateReplaceButtonText() {
    if (this.replaceButton) {
      this.replaceButton.textContent = this.hasTextSelection ? 'Replace' : 'Insert';
      this.replaceButton.setAttribute('aria-label', 
        this.hasTextSelection ? 
        'Replace selection with generated text' : 
        'Insert generated text at cursor position');
    }
  }

  handleCursorInTextField(element) {
    // Store empty selection but valid context
    this.selectedText = '';
    
    // Create a range for the cursor position
    const range = document.createRange();
    
    if (element.isContentEditable) {
      // Handle contenteditable elements
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.setEnd(selection.anchorNode, selection.anchorOffset);
      } else {
        // If no range, place at beginning of element
        range.setStart(element, 0);
        range.setEnd(element, 0);
      }
    } else {
      // For inputs and textareas, we need a different approach
      // Insert a temporary span to get position
      const tempSpan = document.createElement('span');
      tempSpan.textContent = '|';
      
      // Store current values
      const start = element.selectionStart;
      const value = element.value;
      
      // Insert temporary element into the DOM near the input
      element.parentNode.insertBefore(tempSpan, element.nextSibling);
      
      // Position the span to match cursor
      const inputRect = element.getBoundingClientRect();
      tempSpan.style.position = 'absolute';
      tempSpan.style.top = `${inputRect.top + 5}px`;
      tempSpan.style.left = `${inputRect.left + 5}px`;
      
      // Create a range that includes this span
      range.selectNode(tempSpan);
      
      // Use the range position for edit icon, then remove the span
      const rect = range.getBoundingClientRect();
      this.currentSelection = window.getSelection();
      this.currentRange = range.cloneRange();
      this.positionEditIcon(rect);
      
      tempSpan.remove();
      return;
    }
    
    // For contenteditable, we can use the range directly
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      this.currentSelection = window.getSelection();
      this.currentRange = range.cloneRange();
      this.positionEditIcon(rect);
    } else {
      // If we can't get a good rect, use the element's rectangle
      const elemRect = element.getBoundingClientRect();
      this.currentSelection = window.getSelection();
      this.currentRange = range.cloneRange();
      this.positionEditIcon(elemRect);
    }
  }

  shouldUpdateSelection(selectedText) {
    return selectedText !== this.selectedText || 
           (this.editIcon.style.display === 'none' && 
           !this.promptContainer.classList.contains('active') && 
           !this.resultContainer.classList.contains('active')) ||
           // Add this condition to allow empty text for input fields
           (!selectedText && document.activeElement && 
            (document.activeElement.tagName === 'INPUT' || 
             document.activeElement.tagName === 'TEXTAREA' ||
             document.activeElement.isContentEditable));
  }

  updateSelectionData(selectedText, selection) {
    this.selectedText = selectedText;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width > 0 || rect.height > 0) {
      this.hasTextSelection = selectedText.length > 0;
      this.currentSelection = selection;
      this.currentRange = range.cloneRange();
      this.positionEditIcon(rect);
      this.updateReplaceButtonText();
    } else {
      this.hideAllUIElements();
    }
  }

  positionEditIcon(rect) {
    const iconSize = 42;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    let top = scrollY + rect.bottom + 8;
    let left = scrollX + rect.right - iconSize / 2;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    left = Math.max(scrollX + iconSize/2, Math.min(left, scrollX + viewportWidth - iconSize/2));
    
    if (top + iconSize > scrollY + viewportHeight) {
      top = scrollY + rect.top - iconSize - 8;
    }
    
    this.editIconPosition = { top, left, iconSize };
    
    this.editIcon.style.top = `${this.editIconPosition.top}px`;
    this.editIcon.style.left = `${this.editIconPosition.left}px`;
    this.editIcon.style.display = 'flex';
    this.editIcon.classList.remove('expanding');

    this.promptContainer.classList.remove('active', 'transitioning-out');
    this.promptContainer.style.display = 'none';
    this.resultContainer.classList.remove('active');
  }

  clearSelectionIfNeeded() {
    if (!this.promptContainer.classList.contains('active') && 
        !this.resultContainer.classList.contains('active')) {
      this.selectedText = '';
      this.editIcon.style.display = 'none';
    }
  }

  handleEditIconClick(event) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.currentRange) return;

    const iconSize = this.editIconPosition.iconSize;
    
    this.promptContainer.style.top = `${this.editIconPosition.top}px`;
    this.promptContainer.style.left = `${this.editIconPosition.left - iconSize/2}px`;
    this.promptContainer.style.display = 'flex';
    
    this.editIcon.classList.add('expanding');
    
    setTimeout(() => {
      this.promptContainer.classList.add('active');
      
      setTimeout(() => {
        this.promptInput.value = '';
        this.promptInput.disabled = false;
        this.loadingIndicator.style.display = 'none';
        this.skeletonContainer.style.display = 'none';
        this.promptInput.focus();
        
        this.editIcon.style.display = 'none';
        this.editIcon.classList.remove('expanding');
      }, 250);
    }, 50);
  }

  renderMarkdown(text) {
    let sanitized = this.sanitizeHTML(text);
    const html = this.parseMarkdown(sanitized);
    this.generatedContent.className = 'chikki-markdown';
    this.generatedContent.innerHTML = html;
  }

  parseMarkdown(text) {
    text = this.processHeaders(text);
    text = this.processFormatting(text);
    text = this.processLists(text);
    text = this.processCodeElements(text);
    text = this.processBlockElements(text);
    text = this.processParagraphs(text);
    
    return text;
  }

  processHeaders(text) {
    text = text.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    text = text.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    text = text.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    text = text.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
    text = text.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
    return text;
  }

  processFormatting(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return text;
  }

  processLists(text) {
    text = text.replace(/^\* (.*?)$/gm, '<ul><li>$1</li></ul>');
    text = text.replace(/^\- (.*?)$/gm, '<ul><li>$1</li></ul>');
    text = text.replace(/<\/ul>\s*<ul>/g, '');
    
    text = text.replace(/^\d+\. (.*?)$/gm, '<ol><li>$1</li></ol>');
    text = text.replace(/<\/ol>\s*<ol>/g, '');
    return text;
  }

  processCodeElements(text) {
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  }

  processBlockElements(text) {
    text = text.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
    text = text.replace(/^---$/gm, '<hr>');
    return text;
  }

  processParagraphs(text) {
    text = text.replace(/\r\n/g, '\n');
    const paragraphs = text.split(/\n\n+/);
    
    text = paragraphs.map(para => {
      if (para.trim().startsWith('<') && para.trim().endsWith('>')) {
        return para;
      }
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');
    
    return text;
  }

  renderGeneratedContent() {
    const containsMarkdown = /[#*_\[\]`]/.test(this.generatedText);
    
    if (containsMarkdown) {
      this.renderMarkdown(this.generatedText);
    } else {
      const sanitizedText = this.sanitizeHTML(this.generatedText);
      this.generatedContent.innerHTML = sanitizedText;
    }
    
    this.updateReplaceButtonText();
    this.resultContainer.style.display = 'block';
  }

  sanitizeHTML(text) {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async handlePromptInputKeydown(event) {
    if (event.key === 'Enter' && !this.isLoading) {
      event.preventDefault();
      const prompt = this.promptInput.value.trim();
      if (!prompt) return;

      this.isLoading = true;
      this.promptInput.disabled = true;
      
      const promptRect = this.promptContainer.getBoundingClientRect();
      
      this.showLoadingState();
      
      try {
        const apiResult = await this.fetchGeneratedText(prompt);
        this.generatedText = apiResult;
        
        this.positionResultContainer(promptRect);
        this.renderGeneratedContent();
        
        this.animateTransitionToResult();
      } catch (err) {
        this.handleApiError(err, promptRect);
      } finally {
        this.resetLoadingState();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.hideAllUIElements();
    }
  }

  showLoadingState() {
    this.promptInput.style.opacity = '0';
    this.promptInput.style.transform = 'translateY(10px)';
    this.promptContainer.classList.add('loading');
    this.skeletonContainer.style.display = 'block';
    
    const skeletonLines = this.skeletonContainer.querySelectorAll('.chikki-skeleton-line');
    skeletonLines.forEach(line => line.classList.add('chikki-loading-pulse'));
  }

  async fetchGeneratedText(prompt) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const systemInstructions = `
    You are a precise content generation assistant. You are a content writer with years of experience, you are the writing assistant.
    IMPORTANT: Generate ONLY the exact content type requested without explanations, alternatives, or additional content.
    - If a title is requested, return ONLY a title.
    - If an email is requested, return ONLY a properly formatted email.
    - If code is requested, return ONLY the code without explanations.
    - If a summary is requested, provide ONLY the summary.
    - Never provide multiple options or variations unless explicitly asked.
    - Never add introductory or concluding remarks like "Here is the content:" or "Sure, here it is:".
    - Never explain your reasoning or methodology.
    - Format your response appropriately for the requested content type.
    - Keep strictly to the requested content format and length.
    - Respond ONLY with the generated content itself.
    `;


    const [apiResult] = await Promise.all([
      new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'generate',
            prompt: `${systemInstructions}\n\nContext: "${this.selectedText}"\nRequest: "${prompt}"`
          },
          response => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.data) {
              resolve(response.data);
            } else {
              reject(new Error("Invalid response from background script"));
            }
          }
        );
      }),
      delay(900)
    ]);

    return apiResult;
  }

  positionResultContainer(promptRect) {
    const resultTop = promptRect.top - 16 - this.resultContainer.offsetHeight;
    this.resultContainer.style.top = `${resultTop < 0 ? promptRect.bottom + 16 : resultTop}px`;
    this.resultContainer.style.left = `${promptRect.left}px`;
    this.promptContainer.classList.add('transitioning-out');
  }

  animateTransitionToResult() {
    setTimeout(() => {
      this.resultContainer.classList.add('active');
      
      setTimeout(() => {
        this.promptContainer.classList.remove('active', 'transitioning-out', 'loading');
        this.promptContainer.style.display = 'none';
        
        const skeletonLines = this.skeletonContainer.querySelectorAll('.chikki-skeleton-line');
        skeletonLines.forEach(line => line.classList.remove('chikki-loading-pulse'));
      }, 300);
    }, 150);
  }

  handleApiError(err, promptRect) {
    console.error("Error generating text:", err);
    
    this.generatedContent.style.color = '#e53e3e';
    this.generatedContent.textContent = `⚠️ Error: ${err.message || 'Unknown error'}`;
    
    const resultTop = promptRect.top - 16 - this.resultContainer.offsetHeight;
    this.resultContainer.style.top = `${resultTop < 0 ? promptRect.bottom + 16 : resultTop}px`;
    this.resultContainer.style.left = `${promptRect.left}px`;
    
    if (this.replaceButton) {
      this.replaceButton.style.display = 'none';
    }
    
    this.promptContainer.classList.add('transitioning-out');
    setTimeout(() => {
      this.resultContainer.classList.add('active');
      
      setTimeout(() => {
        this.promptContainer.classList.remove('active', 'transitioning-out');
        this.promptContainer.style.display = 'none';
      }, 300);
    }, 150);
  }

  resetLoadingState() {
    this.isLoading = false;
    this.promptInput.disabled = false;
    this.promptInput.value = '';
    this.loadingIndicator.style.display = 'none';
    this.skeletonContainer.style.display = 'none';
    this.promptInput.style.display = 'block';
    this.promptInput.style.opacity = '1';
    this.promptInput.style.transform = 'none';
    
    if (this.replaceButton) {
      this.replaceButton.style.display = '';
    }
  }

  async handleRegenerateButtonClick(event) {
    event.stopPropagation();
    event.preventDefault();
    
    if (this.isLoading || !this.selectedText) return;
    
    this.isLoading = true;
    const resultRect = this.resultContainer.getBoundingClientRect();
    this.resultContainer.classList.remove('active');
    
    setTimeout(async () => {
      this.setupRegenerationLoading(resultRect);
      
      try {
        const apiResult = await this.fetchRegeneratedText();
        this.generatedText = apiResult;
        
        this.prepareResultContainerForRegeneration(resultRect);
        this.renderGeneratedContent();
        this.animateRegenerationResult();
      } catch (err) {
        this.handleRegenerationError(err);
      } finally {
        this.resetRegenerationState();
      }
    }, 300);
  }

  setupRegenerationLoading(resultRect) {
    this.promptContainer.style.top = `${resultRect.top}px`;
    this.promptContainer.style.left = `${resultRect.left}px`;
    this.promptContainer.style.display = 'flex';
    
    this.promptContainer.classList.add('loading', 'active');
    this.promptInput.style.display = 'none';
    this.skeletonContainer.style.display = 'block';
  }

  async fetchRegeneratedText() {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    const systemInstructions = `
    You are a precise content generation assistant.
    IMPORTANT: Generate ONLY the exact content type that was previously requested.
    - Maintain the same format and structure as would be expected for this content type
    - Do not add explanations, comments, or additional material
    - Create a different version but keep the same style and purpose
    - Never provide multiple options or alternatives
    - Never add introductory or concluding remarks
    - Never explain your reasoning or changes made
    `;
    
    const [apiResult] = await Promise.all([
      new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'generate',
            prompt: `${systemInstructions}\n\nContext: "${this.selectedText}"\nRequest: "Generate an alternative version of the previously requested content."`
          },
          response => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.data) {
              resolve(response.data);
            } else {
              reject(new Error("Invalid response from background script"));
            }
          }
        );
      }),
      delay(900)
    ]);
    
    return apiResult;
  }

  prepareResultContainerForRegeneration(resultRect) {
    this.resultContainer.style.top = `${resultRect.top}px`;
    this.resultContainer.style.left = `${resultRect.left}px`;
    this.promptContainer.classList.add('transitioning-out');
  }

  animateRegenerationResult() {
    setTimeout(() => {
      this.resultContainer.classList.add('active');
      
      setTimeout(() => {
        this.promptContainer.classList.remove('active', 'transitioning-out', 'loading');
        this.promptContainer.style.display = 'none';
        this.promptInput.style.display = 'block';
      }, 300);
    }, 150);
  }

  handleRegenerationError(err) {
    console.error("Error regenerating text:", err);
    
    this.generatedContent.style.color = '#e53e3e';
    this.generatedContent.textContent = `⚠️ Error: ${err.message || 'Unknown error'}`;
    
    this.promptContainer.classList.add('transitioning-out');
    setTimeout(() => {
      this.resultContainer.classList.add('active');
      
      setTimeout(() => {
        this.promptContainer.classList.remove('active', 'transitioning-out');
        this.promptContainer.style.display = 'none';
      }, 300);
    }, 150);
  }

  resetRegenerationState() {
    this.isLoading = false;
    this.promptInput.disabled = false;
    this.loadingIndicator.style.display = 'none';
    this.skeletonContainer.style.display = 'none';
  }

  handleReplaceButtonClick(event) {
    event.stopPropagation();
    event.preventDefault();

    if (this.currentRange && this.generatedText !== undefined) {
      try {
        const range = this.currentRange;
        const selection = this.currentSelection;
        const rawGeneratedText = this.generatedText;
        
        // Find the element where the cursor or selection is
        let targetElement = range.startContainer;
        if (targetElement.nodeType === Node.TEXT_NODE) {
          targetElement = targetElement.parentNode;
        }

        // Handle INPUT and TEXTAREA
        if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
          const inputElement = targetElement;
          const start = inputElement.selectionStart;
          const end = inputElement.selectionEnd;
          const currentValue = inputElement.value;
          
          // If no selection (start === end), insert at cursor position
          // Otherwise replace the selected text
          const newValue = currentValue.substring(0, start) + rawGeneratedText + currentValue.substring(end);
          inputElement.value = newValue;

          // Update cursor position after insertion
          const newCursorPos = start + rawGeneratedText.length;
          inputElement.focus();
          setTimeout(() => {
            inputElement.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);

          // Trigger input/change events
          inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        } else {
          // Handle contenteditable or other elements
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }

          // Delete the current selection content or insert at cursor
          range.deleteContents();

          // Determine if we should insert as HTML or plain text
          const isRichTextContext = targetElement.isContentEditable && 
                                   targetElement.getAttribute('contenteditable') !== 'false';
          const containsMarkdown = /[#*_\[\]`]/.test(rawGeneratedText);
          
          let nodeToInsert;

          if (isRichTextContext && containsMarkdown) {
            // Render markdown to HTML for rich text contexts
            const tempContainer = document.createElement('div');
            let sanitized = this.sanitizeHTML(rawGeneratedText);
            tempContainer.innerHTML = this.parseMarkdown(sanitized);
            
            nodeToInsert = document.createDocumentFragment();
            while (tempContainer.firstChild) {
              nodeToInsert.appendChild(tempContainer.firstChild);
            }
          } else {
            nodeToInsert = document.createTextNode(rawGeneratedText);
          }

          range.insertNode(nodeToInsert);
          range.collapse(false);
          
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      } catch (err) {
        console.error("Error replacing text:", err);
        alert("Error replacing text: " + err.message);
      } finally {
        this.hideAllUIElements();
        this.resetState();
      }
    } else {
      console.warn("Replace button clicked but state was invalid.");
      this.hideAllUIElements();
      this.resetState();
    }
  }

  // Helper method to determine if we're in a plain text context
  isPlainTextContext(range) {
    // Check if parent node is an input or textarea or has contenteditable=false
    const node = range.startContainer;
    const parent = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    
    // Check if we're inside an input, textarea, or a node with contenteditable=false
    return (
      parent.tagName === 'INPUT' || 
      parent.tagName === 'TEXTAREA' ||
      parent.getAttribute('contenteditable') === 'false'
    );
  }

  handleClickOutside(event) {
    if (!this.container.contains(event.target) &&
        this.editIcon.style.display === 'none' && 
        !this.promptContainer.classList.contains('active') && 
        !this.resultContainer.classList.contains('active')) {
      return;
    }

    if (this.container && !this.container.contains(event.target)) {
      this.hideAllUIElements();
    }
  }

  hideAllUIElements() {
    this.resultContainer.classList.remove('active');
    this.promptContainer.classList.remove('active', 'transitioning-out');
    
    setTimeout(() => {
      this.editIcon.style.display = 'none';
      this.editIcon.classList.remove('expanding');
      this.promptContainer.style.display = 'none';
      this.promptInput.value = '';
      this.promptInput.disabled = false;
      this.loadingIndicator.style.display = 'none';
      this.skeletonContainer.style.display = 'none';
      this.promptInput.style.display = 'block';
    }, 300);
  }

  resetState() {
    this.selectedText = '';
    this.generatedText = '';
    this.currentSelection = null;
    this.currentRange = null;
    this.isLoading = false;
    
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

  isClickInsideComponent(event) {
    // Check if the click happened inside any of our UI components
    if (!event || !event.target) return false;
    
    return (
      this.container.contains(event.target) ||
      this.editIcon.contains(event.target) ||
      this.promptContainer.contains(event.target) ||
      this.resultContainer.contains(event.target)
    );
  }
}

function initializeChikki() {
  if (!window.chikkiInstance) {
    window.chikkiInstance = new Chikki();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChikki);
} else {
  initializeChikki();
}