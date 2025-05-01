class Chikki {
  constructor() {
    this.selectedText = '';
    this.currentSelection = null;
    this.currentRange = null;
    this.generatedText = '';
    this.isLoading = false;
    this.hasTextSelection = false;
    this.init();
  }

  init() {
    try {
      this.createUIElements();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error initializing Chikki:", error);
    }
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
      // Initially hide the container
      this.container.style.cssText =
        'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; display: none;';
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
    this.resultContainer.style.display = 'none';

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
      this.hasTextSelection ? 'Replace selection with generated text' : 'Insert generated text at cursor position');
    
    buttonContainer.appendChild(this.regenerateButton);
    buttonContainer.appendChild(this.replaceButton);
    this.resultContainer.appendChild(buttonContainer);
    
    this.container.appendChild(this.resultContainer);
  }

  setupEventListeners() {
    try {
        // Use mouseup as the primary trigger for showing the icon after selection
        document.addEventListener('mouseup', this.handleTextSelection.bind(this), true);

        // Check for each element before attaching the event listener
        if (this.editIcon) {
            this.editIcon.addEventListener('click', this.handleEditIconClick.bind(this));
        }
        if (this.promptInput) {
            this.promptInput.addEventListener('keydown', this.handlePromptInputKeydown.bind(this));
        }
        if (this.replaceButton) {
            this.replaceButton.addEventListener('click', this.handleReplaceButtonClick.bind(this));
        }
        if (this.regenerateButton) {
            this.regenerateButton.addEventListener('click', this.handleRegenerateButtonClick.bind(this));
        }
        // Use mousedown for clicks outside to hide UI elements promptly
        document.addEventListener('mousedown', this.handleClickOutside.bind(this), true);
    } catch (error) {
        console.error("Error setting up event listeners:", error);
    }
}

  handleTextSelection(event) {
    try {
      // Prevent handling clicks inside our own UI
      if (event && this.isClickInsideComponent(event)) {
        // If the click is inside the UI, don't hide the icon immediately,
        // let the specific component handlers manage state.
        return;
      }

      // Use a small delay to allow the selection object to update after mouseup
      setTimeout(() => {
        const selection = window.getSelection();

        // No selection or empty selection range
        if (!selection || selection.rangeCount === 0) {
          this.hideEditIcon();
          this.hasTextSelection = false;
          this.updateReplaceButtonText();
          return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();

        // Collapsed selection (cursor) or empty selected text
        if (range.collapsed || !selectedText || selectedText.length === 0) {
          this.hasTextSelection = false;
          // Only hide the icon if the prompt/result aren't active
          if (!this.promptContainer?.classList.contains('active') && !this.resultContainer?.classList.contains('active')) {
             this.hideEditIcon();
          }
          this.updateReplaceButtonText();
          return;
        }

        // Determine the target element and check if it's editable
        let targetElement = range.commonAncestorContainer;
        if (targetElement.nodeType === Node.TEXT_NODE) {
          targetElement = targetElement.parentNode;
        }

        const isValidTarget = targetElement && (
          targetElement.tagName === 'INPUT' ||
          targetElement.tagName === 'TEXTAREA' ||
          targetElement.isContentEditable
        );

        if (!isValidTarget) {
          // Selection is not inside a valid editable target
          this.hasTextSelection = false;
           // Only hide the icon if the prompt/result aren't active
          if (!this.promptContainer?.classList.contains('active') && !this.resultContainer?.classList.contains('active')) {
             this.hideEditIcon();
          }
          this.updateReplaceButtonText();
          return;
        }

        // Valid selection in an editable target
        this.hasTextSelection = true;
        if (this.shouldUpdateSelection(selectedText)) {
          this.updateSelectionData(selectedText, selection); // Position and show the icon
        }
        this.updateReplaceButtonText();

      }, 50); // Delay helps ensure selection is stable
    } catch (error) {
      console.error("Error in handleTextSelection:", error);
      this.hideEditIcon(); // Ensure icon is hidden on error
    }
  }

  updateReplaceButtonText() {
    if (this.replaceButton) {
      this.replaceButton.textContent = this.hasTextSelection ? 'Replace' : 'Insert';
      this.replaceButton.setAttribute('aria-label',
        this.hasTextSelection ? 'Replace selection with generated text' : 'Insert generated text at cursor position');
    }
  }

  shouldUpdateSelection(selectedText) {
    // Only update if we have valid text AND either it's different from previous selection
    // or our UI elements aren't already active
    return selectedText && (
      selectedText !== this.selectedText || 
      (this.editIcon && this.editIcon.style.display === 'none' &&
      this.promptContainer && !this.promptContainer.classList.contains('active') &&
      this.resultContainer && !this.resultContainer.classList.contains('active'))
    );
  }

  updateSelectionData(selectedText, selection) {
    try {
      this.selectedText = selectedText;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width > 0 || rect.height > 0) {
        this.hasTextSelection = selectedText.length > 0;
        this.currentSelection = selection;
        this.currentRange = range.cloneRange();
        // Show the container only when a valid selection is made
        if (this.container) {
          this.container.style.display = 'block';
        }
        this.positionEditIcon(rect);
        this.updateReplaceButtonText();
      } else {
        this.hideAllUIElements();
      }
    } catch (error) {
      console.error("Error updating selection data:", error);
    }
  }

  adjustPositionForViewport(desiredTop, desiredLeft, elementWidth, elementHeight) {
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const margin = 16; // Increased margin for better visibility near edges

    // For very small screens, adapt the element width
    const adaptedWidth = Math.min(elementWidth, viewportWidth - (margin * 2));

    // Adjust left position to ensure the element stays within horizontal bounds
    let adjustedLeft = Math.max(scrollX + margin, desiredLeft);
    adjustedLeft = Math.min(adjustedLeft, scrollX + viewportWidth - adaptedWidth - margin);

    // Adjust top position to ensure the element stays within vertical bounds
    let adjustedTop = Math.max(scrollY + margin, desiredTop);
    adjustedTop = Math.min(adjustedTop, scrollY + viewportHeight - elementHeight - margin);

    return { 
      top: adjustedTop, 
      left: adjustedLeft,
      width: adaptedWidth // Return the potentially adapted width
    };
  }

  positionEditIcon(rect) {
    try {
      const iconSize = 40;
      const scrollX = window.scrollX || 0;
      const scrollY = window.scrollY || 0;
      
      let desiredTop = scrollY + rect.bottom + 8;
      let desiredLeft = scrollX + rect.left + (rect.width / 2) - (iconSize / 2);

      if (desiredTop + iconSize + 8 > scrollY + (window.innerHeight || document.documentElement.clientHeight)) {
        desiredTop = scrollY + rect.top - iconSize - 8;
      }

      const adjustedPosition = this.adjustPositionForViewport(desiredTop, desiredLeft, iconSize, iconSize);

      this.editIconPosition = { 
        top: adjustedPosition.top, 
        left: adjustedPosition.left, 
        width: iconSize, 
        height: iconSize 
      };
      
      if (this.editIcon) {
        this.editIcon.style.top = `${adjustedPosition.top}px`;
        this.editIcon.style.left = `${adjustedPosition.left}px`;
        this.editIcon.style.display = 'flex';
        this.editIcon.classList.remove('expanding');
      }

      if (this.promptContainer) {
        this.promptContainer.classList.remove('active', 'transitioning-out');
        this.promptContainer.style.display = 'none';
      }
      
      if (this.resultContainer) {
        this.resultContainer.classList.remove('active');
        this.resultContainer.style.display = 'none';
      }
    } catch (error) {
      console.error("Error positioning edit icon:", error);
    }
  }

  // Ensure hideEditIcon is correctly implemented
  hideEditIcon() {
    if (this.editIcon) {
      this.editIcon.style.display = 'none';
    }
    // Don't clear selectedText here, it might be needed if prompt/result is active
    // this.selectedText = '';
  }

  // Ensure clearSelectionIfNeeded correctly hides the icon
  clearSelectionIfNeeded() {
    // This function might not be strictly necessary anymore with the refined handleTextSelection
    // but keeping it ensures the icon hides if state becomes inconsistent.
    if (!this.hasTextSelection &&
        (!this.promptContainer || !this.promptContainer.classList.contains('active')) &&
        (!this.resultContainer || !this.resultContainer.classList.contains('active')))
    {
        this.hideEditIcon();
    }
  }


  handleEditIconClick(event) {
    try {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (!this.currentRange || !this.editIconPosition) return;

      const promptWidth = 340;
      const promptHeight = 56;
      
      if (!this.editIcon) return;
      const iconRect = this.editIcon.getBoundingClientRect();
      const desiredTop = iconRect.top;
      const desiredLeft = iconRect.left + (iconRect.width / 2) - (promptWidth / 2);

      const adjustedPosition = this.adjustPositionForViewport(desiredTop, desiredLeft, promptWidth, promptHeight);

      if (this.promptContainer) {
        this.promptContainer.style.top = `${adjustedPosition.top}px`;
        this.promptContainer.style.left = `${adjustedPosition.left}px`;
        this.promptContainer.style.width = `${promptWidth}px`;
        this.promptContainer.style.height = `${promptHeight}px`;
        this.promptContainer.style.display = 'flex';
      }
      
      if (this.editIcon) {
        this.editIcon.classList.add('expanding');
      }
      
      setTimeout(() => {
        if (this.promptContainer) {
          this.promptContainer.classList.add('active');
        }
        
        setTimeout(() => {
          if (this.promptInput) {
            this.promptInput.value = '';
            this.promptInput.disabled = false;
          }
          
          if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
          }
          
          if (this.skeletonContainer) {
            this.skeletonContainer.style.display = 'none';
          }
          
          if (this.promptInput) {
            this.promptInput.focus();
          }
          
          if (this.editIcon) {
            this.editIcon.style.display = 'none';
            this.editIcon.classList.remove('expanding');
          }
        }, 150);
      }, 20);
    } catch (error) {
      console.error("Error handling edit icon click:", error);
    }
  }

  renderMarkdown(text) {
    try {
      let sanitized = this.sanitizeHTML(text);
      const html = this.parseMarkdown(sanitized);
      if (this.generatedContent) {
        this.generatedContent.className = 'chikki-markdown';
        this.generatedContent.innerHTML = html;
      }
    } catch (error) {
      console.error("Error rendering markdown:", error);
    }
  }

  parseMarkdown(text) {
    try {
      text = this.processHeaders(text);
      text = this.processFormatting(text);
      text = this.processLists(text);
      text = this.processCodeElements(text);
      text = this.processBlockElements(text);
      text = this.processParagraphs(text);
      
      return text;
    } catch (error) {
      console.error("Error parsing markdown:", error);
      return text || '';
    }
  }

  processHeaders(text) {
    if (!text) return '';
    text = text.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    text = text.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    text = text.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    text = text.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
    text = text.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
    return text;
  }

  processFormatting(text) {
    if (!text) return '';
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return text;
  }

  processLists(text) {
    if (!text) return '';
    text = text.replace(/^\* (.*?)$/gm, '<ul><li>$1</li></ul>');
    text = text.replace(/^\- (.*?)$/gm, '<ul><li>$1</li></ul>');
    text = text.replace(/<\/ul>\s*<ul>/g, '');
    
    text = text.replace(/^\d+\. (.*?)$/gm, '<ol><li>$1</li></ol>');
    text = text.replace(/<\/ol>\s*<ol>/g, '');
    return text;
  }

  processCodeElements(text) {
    if (!text) return '';
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  }

  processBlockElements(text) {
    if (!text) return '';
    text = text.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
    text = text.replace(/^---$/gm, '<hr>');
    return text;
  }

  processParagraphs(text) {
    if (!text) return '';
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
    try {
      if (!this.generatedText) {
        return;
      }
      
      const containsMarkdown = /[#*_\[\]`]/.test(this.generatedText);
      
      if (containsMarkdown) {
        this.renderMarkdown(this.generatedText);
      } else {
        const sanitizedText = this.sanitizeHTML(this.generatedText);
        if (this.generatedContent) {
          this.generatedContent.innerHTML = sanitizedText;
        }
      }
      
      this.updateReplaceButtonText();
      if (this.resultContainer) {
        this.resultContainer.style.display = 'block';
      }
    } catch (error) {
      console.error("Error rendering generated content:", error);
    }
  }

  sanitizeHTML(text) {
    if (!text) return '';
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async fetchGeneratedText(prompt) {
    try {
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

      const systemInstructions = `
      You are a literary virtuoso, a writing assistant with the precision of Hemingway, the wit of Wilde, and the imagination of García Márquez.
      IMPORTANT: Craft ONLY the exact content requested—nothing more, nothing less.
      - For a title, deliver ONLY that perfect constellation of words that captures essence.
      - For an email, compose ONLY the complete message in its most effective form.
      - For code, present ONLY the elegant solution, unadorned by explanation.
      - For a summary, distill ONLY the essential narrative, preserving its soul.
      - Never divide your creative vision into variations unless specifically requested.
      - Resist the temptation to frame your work with unnecessary preambles or conclusions.
      - Keep the architecture of your craft invisible, as the best writing appears effortless.
      - Format your response with the structure the content naturally demands.
      - Honor requested length and format as a poet honors the sonnet's fourteen lines.
      - Present ONLY the requested creation itself—pure, complete, and illuminating.
      `;

      const [apiResult] = await Promise.all([
        new Promise((resolve, reject) => {
          if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
            reject(new Error("Chrome runtime API is not available"));
            return;
          }
          
          chrome.runtime.sendMessage(
            {
              type: 'generate',
              prompt: `${systemInstructions}\n\nContext: "${this.selectedText || ''}"\nRequest: "${prompt}"`
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
        delay(900)
      ]);

      return apiResult;
    } catch (error) {
      console.error("Error fetching generated text:", error);
      throw error;
    }
  }

  async handlePromptInputKeydown(event) {
    try {
      if (event.key === 'Enter' && !this.isLoading) {
        event.preventDefault();
        
        if (!this.promptInput) return;
        const prompt = this.promptInput.value.trim();
        if (!prompt) return;

        this.isLoading = true;
        if (this.promptInput) {
          this.promptInput.disabled = true;
        }
        
        this.showLoadingState(this.editIconPosition);
        
        try {
          const apiResult = await this.fetchGeneratedText(prompt);
          this.generatedText = apiResult;
          
          this.positionResultContainer(this.editIconPosition); 
          this.renderGeneratedContent();
          
          this.animateTransitionToResult();
        } catch (err) {
          this.handleApiError(err, this.editIconPosition); 
        } finally {
          this.resetLoadingState();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.hideAllUIElements();
      }
    } catch (error) {
      console.error("Error handling prompt input keydown:", error);
      this.isLoading = false;
      if (this.promptInput) {
        this.promptInput.disabled = false;
      }
    }
  }

  showLoadingState(iconPosition) {
    try {
      if (this.promptInput) {
        this.promptInput.style.opacity = '0';
        this.promptInput.style.transform = 'translateY(10px)';
      }
      
      if (this.promptContainer) {
        this.promptContainer.classList.add('loading');
      }

      const loadingWidth = 400;
      const loadingHeight = 180;
      
      if (!iconPosition) {
        if(this.promptContainer && this.promptContainer.style.display !== 'none') {
            const promptRect = this.promptContainer.getBoundingClientRect();
            iconPosition = { 
                top: promptRect.top + window.scrollY, 
                left: promptRect.left + window.scrollX, 
                width: promptRect.width, 
                height: promptRect.height 
            };
        } else {
            return;
        }
      }

      // Calculate desired position based on icon (centered horizontally)
      let desiredTop = iconPosition.top;
      let desiredLeft = iconPosition.left + (iconPosition.width / 2) - (loadingWidth / 2);

      const adjustedPosition = this.adjustPositionForViewport(
        desiredTop, 
        desiredLeft, 
        loadingWidth, 
        loadingHeight
      );

      if (this.promptContainer) {
        this.promptContainer.style.top = `${adjustedPosition.top}px`;
        this.promptContainer.style.left = `${adjustedPosition.left}px`;
        this.promptContainer.style.width = `${adjustedPosition.width}px`;
        this.promptContainer.style.height = `${loadingHeight}px`;
      }
      
      if (this.skeletonContainer) {
        this.skeletonContainer.style.display = 'block';
      }
      
      if (this.skeletonContainer) {
        const skeletonLines = this.skeletonContainer.querySelectorAll('.chikki-skeleton-line');
        skeletonLines.forEach(line => line.classList.add('chikki-loading-pulse'));
      }
    } catch (error) {
      console.error("Error showing loading state:", error);
    }
  }

  setupRegenerationLoading(currentResultRect) {
    try {
      const loadingWidth = 400;
      const loadingHeight = 180;

      const desiredTop = currentResultRect.top + window.scrollY;
      const desiredLeft = currentResultRect.left + window.scrollX;

      const adjustedPosition = this.adjustPositionForViewport(
          desiredTop, 
          desiredLeft, 
          loadingWidth, 
          loadingHeight
      );

      if (this.promptContainer) {
        this.promptContainer.style.top = `${adjustedPosition.top}px`;
        this.promptContainer.style.left = `${adjustedPosition.left}px`;
        this.promptContainer.style.width = `${adjustedPosition.width}px`;
        this.promptContainer.style.height = `${loadingHeight}px`;
        this.promptContainer.style.display = 'flex';
        this.promptContainer.classList.add('loading', 'active');
      }
      
      if (this.promptInput) {
        this.promptInput.style.display = 'none';
      }
      
      if (this.skeletonContainer) {
        this.skeletonContainer.style.display = 'block';
        const skeletonLines = this.skeletonContainer.querySelectorAll('.chikki-skeleton-line');
        skeletonLines.forEach(line => line.classList.add('chikki-loading-pulse'));
      }
    } catch (error) {
      console.error("Error setting up regeneration loading:", error);
    }
  }

  positionResultContainer(iconPosition) {
    try {
      const resultWidth = 400; 
      const resultMinHeight = 180; 
      
      if (!iconPosition) {
          console.error("Cannot position result container: Missing icon position.");
          if(this.promptContainer && this.promptContainer.style.display !== 'none') {
              const promptRect = this.promptContainer.getBoundingClientRect();
              iconPosition = { 
                  top: promptRect.top + window.scrollY, 
                  left: promptRect.left + window.scrollX, 
                  width: promptRect.width, 
                  height: promptRect.height 
              };
          } else {
              this.hideAllUIElements();
              return;
          }
      }

      let desiredTop = iconPosition.top;
      let desiredLeft = iconPosition.left + (iconPosition.width / 2) - (resultWidth / 2);

      const adjustedPosition = this.adjustPositionForViewport(
        desiredTop, 
        desiredLeft, 
        resultWidth, 
        resultMinHeight
      );

      if (this.resultContainer) {
        this.resultContainer.style.top = `${adjustedPosition.top}px`;
        this.resultContainer.style.left = `${adjustedPosition.left}px`;
        this.resultContainer.style.width = `${adjustedPosition.width}px`;
        this.resultContainer.style.display = 'flex'; 
        
        const maxHeight = window.innerHeight - 32;
        this.resultContainer.style.maxHeight = `${maxHeight}px`;
      }
      
      if (this.promptContainer) {
        this.promptContainer.classList.add('transitioning-out');
      }
    } catch (error) {
      console.error("Error positioning result container:", error);
    }
  }

  handleApiError(err, iconPosition) {
    try {
      console.error("Error generating text:", err);

      const errorMessage = err.message || 'Unknown error';
      
      if (this.generatedContent) {
        this.generatedContent.style.color = '#e53e3e';
        this.generatedContent.textContent = `⚠️ Error: ${errorMessage}`;
      }

      const resultWidth = 400;
      const resultMinHeight = 180;

      if (!iconPosition) {
          console.error("Cannot position error container: Missing icon position.");
           if(this.promptContainer && this.promptContainer.style.display !== 'none') {
              const promptRect = this.promptContainer.getBoundingClientRect();
              iconPosition = { 
                  top: promptRect.top + window.scrollY, 
                  left: promptRect.left + window.scrollX, 
                  width: promptRect.width, 
                  height: promptRect.height 
              };
          } else {
              this.hideAllUIElements();
              return;
          }
      }

      let desiredTop = iconPosition.top;
      let desiredLeft = iconPosition.left + (iconPosition.width / 2) - (resultWidth / 2);

      const adjustedPosition = this.adjustPositionForViewport(
          desiredTop, 
          desiredLeft, 
          resultWidth, 
          resultMinHeight
      );

      if (this.resultContainer) {
        this.resultContainer.style.top = `${adjustedPosition.top}px`;
        this.resultContainer.style.left = `${adjustedPosition.left}px`;
        this.resultContainer.style.width = `${adjustedPosition.width}px`;
        this.resultContainer.style.display = 'flex';
      }

      if (this.replaceButton) {
        this.replaceButton.style.display = 'none';
      }
      if (this.regenerateButton) {
        this.regenerateButton.style.display = 'none';
      }
      if (this.promptContainer) {
        this.promptContainer.classList.add('transitioning-out');
      }
      setTimeout(() => {
        if (this.resultContainer) {
          this.resultContainer.classList.add('active');
        }
        setTimeout(() => {
          if (this.promptContainer) {
            this.promptContainer.classList.remove('active', 'transitioning-out', 'loading');
            this.promptContainer.style.display = 'none';
          }
        }, 300);
      }, 50);
    } catch (error) {
      console.error("Error handling API error:", error);
    }
  }

  handleRegenerationError(err, currentResultRect) {
    try {
      console.error("Error regenerating text:", err);

      const errorMessage = err.message || 'Unknown error';
      
      if (this.generatedContent) {
        this.generatedContent.style.color = '#e53e3e';
        this.generatedContent.textContent = `⚠️ Regen Error: ${errorMessage}`;
      }

      const resultWidth = 400;
      const resultMinHeight = 180;

      const desiredTop = currentResultRect.top + window.scrollY;
      const desiredLeft = currentResultRect.left + window.scrollX;

      const adjustedPosition = this.adjustPositionForViewport(
          desiredTop, 
          desiredLeft, 
          resultWidth, 
          resultMinHeight
      );

      if (this.resultContainer) {
        this.resultContainer.style.top = `${adjustedPosition.top}px`;
        this.resultContainer.style.left = `${adjustedPosition.left}px`;
        this.resultContainer.style.width = `${adjustedPosition.width}px`;
        this.resultContainer.style.display = 'flex'; 
      }

      if (this.replaceButton) {
        this.replaceButton.style.display = 'none';
      }
      if (this.regenerateButton) {
        this.regenerateButton.style.display = 'none';
      }
      if (this.promptContainer) {
        this.promptContainer.classList.add('transitioning-out');
      }
      setTimeout(() => {
        if (this.resultContainer) {
          this.resultContainer.classList.add('active');
        }
        setTimeout(() => {
          if (this.promptContainer) {
            this.promptContainer.classList.remove('active', 'transitioning-out', 'loading');
            this.promptContainer.style.display = 'none';
          }
          this.resetRegenerationState(); 
        }, 300);
      }, 50);
    } catch (error) {
      console.error("Error handling regeneration error:", error);
      this.resetRegenerationState();
    }
  }

  async handleRegenerateButtonClick(event) {
    try {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (this.isLoading) return;
      if (!this.resultContainer) return;

      this.isLoading = true;
      
      // Store the current position *before* hiding
      const currentResultRect = this.resultContainer.getBoundingClientRect(); 
      this.resultContainer.classList.remove('active');

      // Wait for fade-out animation before showing loading
      setTimeout(async () => { 
        // Pass the stored position rect
        this.setupRegenerationLoading(currentResultRect); 

        try {
          const apiResult = await this.fetchRegeneratedText();
          this.generatedText = apiResult;

          // Pass the stored position rect
          this.prepareResultContainerForRegeneration(currentResultRect); 
          this.renderGeneratedContent();
          this.animateRegenerationResult();
        } catch (err) {
           // Pass the stored position rect
          this.handleRegenerationError(err, currentResultRect);
        } 
        // No finally block needed here as resetRegenerationState is called in animateRegenerationResult
      }, 300); // Match CSS transition duration
    } catch (error) {
      console.error("Error handling regenerate button click:", error);
      this.isLoading = false; // Ensure loading state is reset on error
    }
  }

  // Add the missing animation function
  animateTransitionToResult() {
    try {
      // Start transition animation for the result container
      setTimeout(() => {
        if (this.resultContainer) {
          this.resultContainer.classList.add('active');
        }
        
        // After transition completes, clean up the prompt container
        setTimeout(() => {
          if (this.promptContainer) {
            this.promptContainer.classList.remove('active', 'transitioning-out', 'loading');
            this.promptContainer.style.display = 'none';
          }
        }, 300); // Match the CSS transition duration
      }, 50); // Small delay to ensure DOM updates before animation starts
    } catch (error) {
      console.error("Error animating transition to result:", error);
    }
  }

  // Add the missing function for regeneration result animation for consistency
  animateRegenerationResult() {
    try {
      setTimeout(() => {
        if (this.resultContainer) {
          this.resultContainer.classList.add('active');
        }
        
        setTimeout(() => {
          if (this.promptContainer) {
            this.promptContainer.classList.remove('active', 'transitioning-out', 'loading');
            this.promptContainer.style.display = 'none';
          }
          this.resetRegenerationState();
        }, 300); // Match the CSS transition duration
      }, 50); // Small delay to ensure DOM updates before animation starts
    } catch (error) {
      console.error("Error animating regeneration result:", error);
      this.resetRegenerationState();
    }
  }

  // Add the missing reset regeneration state function
  resetRegenerationState() {
    try {
      this.isLoading = false;
      
      if (this.promptInput) {
        this.promptInput.disabled = false;
        this.promptInput.style.opacity = '1';
        this.promptInput.style.transform = 'none';
      }
      
      if (this.skeletonContainer) {
        this.skeletonContainer.style.display = 'none';
      }

      if (this.replaceButton) {
        this.replaceButton.style.display = '';
      }
      
      if (this.regenerateButton) {
        this.regenerateButton.style.display = '';
      }
    } catch (error) {
      console.error("Error resetting regeneration state:", error);
    }
  }

  // Add missing function used during regeneration
  prepareResultContainerForRegeneration(currentResultRect) {
    try {
      const resultWidth = 400;
      const resultMinHeight = 180;

      const desiredTop = currentResultRect.top + window.scrollY;
      const desiredLeft = currentResultRect.left + window.scrollX;

      const adjustedPosition = this.adjustPositionForViewport(
          desiredTop, 
          desiredLeft, 
          resultWidth, 
          resultMinHeight
      );

      if (this.resultContainer) {
        this.resultContainer.style.top = `${adjustedPosition.top}px`;
        this.resultContainer.style.left = `${adjustedPosition.left}px`;
        this.resultContainer.style.width = `${adjustedPosition.width}px`;
        this.resultContainer.style.display = 'flex';
      }
      
      if (this.promptContainer) {
        this.promptContainer.classList.add('transitioning-out');
      }
    } catch (error) {
      console.error("Error preparing result container for regeneration:", error);
    }
  }

  // Add missing function for fetching regenerated text
  async fetchRegeneratedText() {
    try {
      // Get the current prompt or use a default
      const currentPrompt = this.promptInput && this.promptInput.value.trim() 
        ? this.promptInput.value.trim() 
        : "Regenerate this text";
      console.log("Current prompt for regeneration:", currentPrompt);
      
      // Construct a comprehensive regeneration prompt that includes:
      // 1. The "regenerate this" instruction
      // 2. The current prompt input
      // 3. The previous generated result
      // 4. The original selected text context (handled by fetchGeneratedText)
      const regenerationPrompt = `Regenerate this: ${currentPrompt}\nPrevious result: ${this.generatedText || ""}`;
      
      // Use the existing fetchGeneratedText method with our new prompt
      return await this.fetchGeneratedText(regenerationPrompt);
    } catch (error) {
      console.error("Error fetching regenerated text:", error);
      throw error;
    }
  }

  handleReplaceButtonClick(event) {
    try {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (!this.currentRange || this.generatedText === undefined) {
        console.warn("Replace button clicked but state was invalid.");
        this.hideAllUIElements();
        this.resetState();
        return;
      }

      try {
        const range = this.currentRange;
        const selection = this.currentSelection;
        const rawGeneratedText = this.generatedText;
        
        let targetElement = range.startContainer;
        if (targetElement.nodeType === Node.TEXT_NODE) {
          targetElement = targetElement.parentNode;
        }

        if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
          const inputElement = targetElement;
          const start = inputElement.selectionStart || 0;
          const end = inputElement.selectionEnd || 0;
          const currentValue = inputElement.value || '';
          
          const newValue = currentValue.substring(0, start) + rawGeneratedText + currentValue.substring(end);
          inputElement.value = newValue;

          const newCursorPos = start + rawGeneratedText.length;
          inputElement.focus();
          setTimeout(() => {
            inputElement.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);

          inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        } else {
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }

          range.deleteContents();

          const isRichTextContext = targetElement.isContentEditable && 
                                   targetElement.getAttribute('contenteditable') !== 'false';
          const containsMarkdown = /[#*_\[\]`]/.test(rawGeneratedText);
          
          let nodeToInsert;

          if (isRichTextContext && containsMarkdown) {
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
    } catch (error) {
      console.error("Error handling replace button click:", error);
      this.hideAllUIElements();
      this.resetState();
    }
  }

  isPlainTextContext(range) {
    try {
      const node = range.startContainer;
      const parent = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      
      return (
        parent.tagName === 'INPUT' || 
        parent.tagName === 'TEXTAREA' ||
        parent.getAttribute('contenteditable') === 'false'
      );
    } catch (error) {
      console.error("Error checking if context is plain text:", error);
      return true;
    }
  }

  // Ensure handleClickOutside hides the icon if click is outside all UI
  handleClickOutside(event) {
    try {
      if (!event || !event.target) return;

      const isClickInsideUI = this.isClickInsideComponent(event);

      if (!isClickInsideUI) {
        // Click is outside all Chikki components, hide everything.
        this.hideAllUIElements();
        // Also explicitly ensure hasTextSelection is false if we hide due to outside click
        // unless a new selection is immediately made (handled by mouseup)
        // We might not need to set hasTextSelection false here, as mouseup will re-evaluate.
      }
      // If click is inside, let component handlers manage state.
    } catch (error) {
      console.error("Error handling click outside:", error);
      this.hideAllUIElements(); // Hide on error as a safeguard
    }
  }

  // Ensure hideAllUIElements correctly hides the edit icon too
  hideAllUIElements() {
    try {
      if (this.resultContainer) {
        this.resultContainer.classList.remove('active');
      }
      if (this.promptContainer) {
        this.promptContainer.classList.remove('active', 'transitioning-out', 'loading');
      }

      setTimeout(() => {
        if (this.editIcon) {
          this.editIcon.style.display = 'none';
          this.editIcon.classList.remove('expanding');
        }

        if (this.promptContainer) {
          this.promptContainer.style.display = 'none';
          if (this.promptInput) {
            this.promptInput.value = '';
            this.promptInput.disabled = false;
            this.promptInput.style.display = 'block';
            this.promptInput.style.opacity = '1';
            this.promptInput.style.transform = 'none';
          }
          if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
          }
        }
        if (this.resultContainer) {
           this.resultContainer.style.display = 'none';
        }
        // Also hide the container
        if (this.container) {
          this.container.style.display = 'none';
        }
      }, 150);
    } catch (error) {
      console.error("Error hiding all UI elements:", error);
    }
  }

  resetState() {
    try {
      this.selectedText = '';
      this.generatedText = '';
      this.currentSelection = null;
      this.currentRange = null;
      this.isLoading = false;
      
      if (window.getSelection) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
      }
    } catch (error) {
      console.error("Error resetting state:", error);
    }
  }

  isClickInsideComponent(event) {
    try {
      if (!event || !event.target) return false;
      
      return (
        (this.container && this.container.contains(event.target)) ||
        (this.editIcon && this.editIcon.contains(event.target)) ||
        (this.promptContainer && this.promptContainer.contains(event.target)) ||
        (this.resultContainer && this.resultContainer.contains(event.target))
      );
    } catch (error) {
      console.error("Error checking if click is inside component:", error);
      return false;
    }
  }
}

function initializeChikki() {
  try {
    if (!window.chikkiInstance) {
      window.chikkiInstance = new Chikki();
      console.log("Chikki initialized successfully");
    }
  } catch (error) {
    console.error("Error initializing Chikki:", error);
  }
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChikki);
  } else {
    initializeChikki();
  }
} catch (error) {
  console.error("Error setting up Chikki initialization:", error);
}