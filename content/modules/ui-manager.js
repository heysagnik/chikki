export class UIManager {
  constructor(core) {
    this.core = core;
    this.container = null;
    this.editIcon = null;
    this.universalContainer = null;
    this.promptInput = null;
    this.loadingIndicator = null;
    this.skeletonContainer = null;
    this.generatedContent = null;
    this.regenerateButton = null;
    this.replaceButton = null;
    this.generateButton = null;
  }

  createUIElements() {
    this.setupContainer();
    this.setupEditIcon();
    this.setupUniversalContainer();
  }

  setupContainer() {
    this.container = document.getElementById('chikki-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'chikki-container';
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

  setupUniversalContainer() {
    this.universalContainer = document.createElement('div');
    this.universalContainer.id = 'chikki-universal-container';
    this.universalContainer.className = 'chikki-universal-container';
    this.universalContainer.style.display = 'none';
    
    const promptSection = document.createElement('div');
    promptSection.className = 'chikki-prompt-section';
    
    this.promptInput = document.createElement('textarea');
    this.promptInput.id = 'chikki-prompt-input';
    this.promptInput.placeholder = 'Message Copilot';
    this.promptInput.setAttribute('aria-label', 'Prompt input');
    this.promptInput.setAttribute('rows', '3');
    promptSection.appendChild(this.promptInput);
    
    const bottomBar = document.createElement('div');
    bottomBar.className = 'chikki-bottom-bar';
    
    const leftSection = document.createElement('div');
    leftSection.className = 'chikki-prompt-left';
    
    const logo = document.createElement('div');
    logo.className = 'chikki-logo';
    logo.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4.29L6 7.57v8.86l6 3.43 6-3.43V7.57l-6-3.28z" fill="#FF5252" />
      <path d="M6 7.57l6 3.43v8.86l-6-3.43V7.57z" fill="#FF7B7B" />
      <path d="M18 7.57l-6 3.43v8.86l6-3.43V7.57z" fill="#E53935" />
      <path d="M6 7.57l6-3.28 6 3.28-6 3.43-6-3.43z" fill="#FF9E80" />
    </svg>`;
    leftSection.appendChild(logo);
    
    const rightSection = document.createElement('div');
    rightSection.className = 'chikki-prompt-right';
    
    this.generateButton = document.createElement('button');
    this.generateButton.id = 'chikki-generate-button';
    this.generateButton.className = 'chikki-generate-button';
    this.generateButton.textContent = 'Generate';
    this.generateButton.setAttribute('aria-label', 'Generate response');
    rightSection.appendChild(this.generateButton);
    
    bottomBar.appendChild(leftSection);
    bottomBar.appendChild(rightSection);
    promptSection.appendChild(bottomBar);
    
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.id = 'chikki-loading';
    this.loadingIndicator.textContent = 'Generating magic...';
    this.loadingIndicator.style.display = 'none';
    
    this.skeletonContainer = document.createElement('div');
    this.skeletonContainer.id = 'chikki-skeleton-container';
    this.skeletonContainer.style.display = 'none';
    
    const loadingHeader = document.createElement('div');
    loadingHeader.className = 'chikki-skeleton-header';
    loadingHeader.style.cssText = 'width: 60%; height: 18px; margin-bottom: 24px !important;';
    loadingHeader.classList.add('chikki-skeleton-line');
    this.skeletonContainer.appendChild(loadingHeader);
    
    const lineWidths = ['80%', '95%', '75%', '85%', '70%'];
    
    for (let i = 0; i < 5; i++) {
      const skeletonLine = document.createElement('div');
      skeletonLine.className = 'chikki-skeleton-line';
      skeletonLine.style.width = lineWidths[i];
      
      if (i > 0) {
        skeletonLine.style.marginLeft = '20px';
        skeletonLine.style.position = 'relative';
      }
      
      this.skeletonContainer.appendChild(skeletonLine);
    }
    
    const resultSection = document.createElement('div');
    resultSection.className = 'chikki-result-section';
    resultSection.style.display = 'none';
    
    this.generatedContent = document.createElement('div');
    this.generatedContent.id = 'chikki-generated-content';
    resultSection.appendChild(this.generatedContent);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'chikki-button-container';
    
    this.regenerateButton = document.createElement('button');
    this.regenerateButton.id = 'chikki-regenerate-button';
    this.regenerateButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg><span>Regenerate</span>`;
    
    this.replaceButton = document.createElement('button');
    this.replaceButton.id = 'chikki-replace-button';
    this.replaceButton.textContent = 'Replace';
    
    buttonContainer.appendChild(this.regenerateButton);
    buttonContainer.appendChild(this.replaceButton);
    resultSection.appendChild(buttonContainer);
    
    const actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.className = 'chikki-result-actions';
    
    const copyButton = document.createElement('button');
    copyButton.className = 'chikki-action-button';
    copyButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy';
    
    const wordButton = document.createElement('button');
    wordButton.className = 'chikki-action-button primary';
    wordButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg> Edit in Word';
    
    actionButtonsContainer.appendChild(copyButton);
    actionButtonsContainer.appendChild(wordButton);
    resultSection.appendChild(actionButtonsContainer);
    
    copyButton.addEventListener('click', () => {
      if (this.generatedContent) {
        navigator.clipboard.writeText(this.generatedContent.innerText)
          .then(() => {
            copyButton.classList.add('success');
            setTimeout(() => copyButton.classList.remove('success'), 1500);
          });
      }
    });
    
    this.generateButton.addEventListener('click', () => {
      const prompt = this.promptInput.value.trim();
      if (!prompt || this.core.interaction.isLoading) return;
      
      this.animateToLoadingState();
      
      setTimeout(() => {
        this.core.interaction.processPrompt(prompt);
      }, 150);
    });
    
    this.universalContainer.appendChild(promptSection);
    this.universalContainer.appendChild(this.loadingIndicator);
    this.universalContainer.appendChild(this.skeletonContainer);
    this.universalContainer.appendChild(resultSection);
    
    this.container.appendChild(this.universalContainer);
  }

  updateReplaceButtonText(hasTextSelection) {
    if (this.replaceButton) {
      this.replaceButton.textContent = hasTextSelection ? 'Replace' : 'Insert';
      this.replaceButton.setAttribute('aria-label',
        hasTextSelection ? 'Replace selection with generated text' : 'Insert generated text at cursor position');
    }
  }

  hideEditIcon() {
    if (this.editIcon) {
      this.editIcon.style.display = 'none';
    }
  }

  hideAllUIElements() {
    if (this.universalContainer) {
      this.universalContainer.classList.remove('active', 'loading', 'result-mode');
    }

    setTimeout(() => {
      if (this.editIcon) {
        this.editIcon.style.display = 'none';
        this.editIcon.classList.remove('expanding');
      }

      if (this.universalContainer) {
        this.universalContainer.style.display = 'none';
        
        if (this.promptInput) {
          this.promptInput.value = '';
          this.promptInput.disabled = false;
          this.promptInput.style.opacity = '1';
          this.promptInput.style.transform = 'none';
        }
        
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
          this.loadingIndicator.style.opacity = '0';
        }
        
        if (this.skeletonContainer) {
          this.skeletonContainer.style.display = 'none';
          this.skeletonContainer.style.opacity = '0';
          
          const skeletonLines = this.skeletonContainer.querySelectorAll('.chikki-skeleton-line');
          skeletonLines.forEach(line => {
            line.classList.remove('chikki-loading-pulse');
          });
        }
        
        const promptSection = this.universalContainer.querySelector('.chikki-prompt-section');
        const resultSection = this.universalContainer.querySelector('.chikki-result-section');
        if (promptSection) {
          promptSection.style.display = 'flex';
          promptSection.style.opacity = '1';
        }
        if (resultSection) resultSection.style.display = 'none';
        
        if (this.generateButton) {
          this.generateButton.disabled = false;
          this.generateButton.classList.remove('loading');
        }
      }
      
      if (this.container) {
        this.container.style.display = 'none';
      }
    }, 150);
  }

  isClickInsideComponent(event) {
    try {
      if (!event || !event.target) return false;
      
      return (
        (this.container && this.container.contains(event.target)) ||
        (this.editIcon && this.editIcon.contains(event.target)) ||
        (this.universalContainer && this.universalContainer.contains(event.target))
      );
    } catch (error) {
      console.error("Error checking if click is inside component:", error);
      return false;
    }
  }

  animateToLoadingState() {
    if (this.promptInput) {
      this.promptInput.disabled = true;
      this.promptInput.style.opacity = '0';
      this.promptInput.style.transform = 'translateY(10px)';
    }
    
    if (this.generateButton) {
      this.generateButton.disabled = true;
      this.generateButton.classList.add('loading');
    }
    
    this.universalContainer.classList.add('loading');
    
    const promptSection = this.universalContainer.querySelector('.chikki-prompt-section');
    if (promptSection) {
      promptSection.style.opacity = '0';
      
      setTimeout(() => {
        promptSection.style.display = 'none';
        
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'block';
          this.loadingIndicator.style.opacity = '1';
          this.loadingIndicator.style.padding = '24px 24px 0 24px';
        }
        
        if (this.skeletonContainer) {
          this.skeletonContainer.style.display = 'block';
          this.skeletonContainer.style.opacity = '1';
          this.skeletonContainer.style.padding = '24px';
          
          const skeletonLines = this.skeletonContainer.querySelectorAll('.chikki-skeleton-line');
          skeletonLines.forEach((line, index) => {
            setTimeout(() => {
              line.classList.add('chikki-loading-pulse');
            }, index * 50);
          });
        }
      }, 100);
    }
    
    this.universalContainer.style.height = `var(--chikki-result-min-height)`;
    this.universalContainer.style.width = `var(--chikki-result-width)`;
  }

  showResultState(content) {
    if (!content) return;

    if (this.loadingIndicator) {
      this.loadingIndicator.style.opacity = '0';
    }
    
    if (this.skeletonContainer) {
      this.skeletonContainer.style.opacity = '0';
    }
    
    setTimeout(() => {
      if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
      if (this.skeletonContainer) this.skeletonContainer.style.display = 'none';
      
      if (this.generatedContent) {
        this.generatedContent.innerHTML = content;
        
        const resultSection = this.universalContainer.querySelector('.chikki-result-section');
        if (resultSection) {
          const actionContainer = resultSection.querySelector('.chikki-result-actions');
          if (actionContainer) {
            actionContainer.remove();
          }
          
          resultSection.style.display = 'flex';
          
          this.universalContainer.classList.remove('loading');
          this.universalContainer.classList.add('result-mode', 'active');
        }
        
        const promptSection = this.universalContainer.querySelector('.chikki-prompt-section');
        if (promptSection) {
          promptSection.style.display = 'none';
        }
      }
    }, 200);
  }
}

export default UIManager;