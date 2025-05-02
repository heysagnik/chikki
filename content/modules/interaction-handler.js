export class InteractionHandler {
  constructor(core) {
    this.core = core;
    this.isLoading = false;
    this.generatedText = '';
  }

  setupEventListeners() {
    document.addEventListener('mouseup', this.handleTextSelection.bind(this), true);

    if (this.core.ui.editIcon) {
      this.core.ui.editIcon.addEventListener('click', this.handleEditIconClick.bind(this));
    }
    if (this.core.ui.promptInput) {
      this.core.ui.promptInput.addEventListener('keydown', this.handlePromptInputKeydown.bind(this));
    }
    if (this.core.ui.replaceButton) {
      this.core.ui.replaceButton.addEventListener('click', this.handleReplaceButtonClick.bind(this));
    }
    if (this.core.ui.regenerateButton) {
      this.core.ui.regenerateButton.addEventListener('click', this.handleRegenerateButtonClick.bind(this));
    }
    document.addEventListener('mousedown', this.handleClickOutside.bind(this), true);
  }

  handleTextSelection(event) {
    this.core.selection.handleTextSelection(event);
  }

  handleEditIconClick(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!this.core.selection.currentRange || !this.core.selection.editIconPosition) return;

    const promptWidth = 400;
    const promptHeight = 120;
    
    if (!this.core.ui.editIcon) return;
    const iconRect = this.core.ui.editIcon.getBoundingClientRect();
    const desiredTop = iconRect.top;
    const desiredLeft = iconRect.left + (iconRect.width / 2) - (promptWidth / 2);

    const adjustedPosition = this.core.positionManager.adjustPositionForViewport(
      desiredTop, desiredLeft, promptWidth, promptHeight
    );

    if (this.core.ui.universalContainer) {
      this.core.ui.universalContainer.style.top = `${adjustedPosition.top}px`;
      this.core.ui.universalContainer.style.left = `${adjustedPosition.left}px`;
      this.core.ui.universalContainer.style.width = `${promptWidth}px`;
      this.core.ui.universalContainer.style.height = `${promptHeight}px`;
      this.core.ui.universalContainer.style.display = 'flex';
    }
    
    if (this.core.ui.editIcon) {
      this.core.ui.editIcon.classList.add('expanding');
    }
    
    setTimeout(() => {
      if (this.core.ui.universalContainer) {
        this.core.ui.universalContainer.classList.add('active');
      }
      
      setTimeout(() => {
        if (this.core.ui.promptInput) {
          this.core.ui.promptInput.focus();
        }
        
        if (this.core.ui.editIcon) {
          this.core.ui.editIcon.style.display = 'none';
          this.core.ui.editIcon.classList.remove('expanding');
        }
      }, 150);
    }, 20);
  }

  async processPrompt(prompt) {
    if (this.isLoading || !prompt) return;
    
    this.isLoading = true;
    
    try {
      const apiResult = await this.core.api.fetchGeneratedText(
        this.core.selection.selectedText, 
        prompt
      );
      
      this.generatedText = apiResult;
      this.core.animation.positionResultContainer(this.core.selection.editIconPosition);
    } catch (err) {
      this.core.animation.handleApiError(err, this.core.selection.editIconPosition);
    } finally {
      this.core.animation.resetLoadingState();
      this.isLoading = false;
    }
  }

  async handlePromptInputKeydown(event) {
    if (event.key === 'Enter' && !this.isLoading) {
      event.preventDefault();
      
      if (!this.core.ui.promptInput) return;
      const prompt = this.core.ui.promptInput.value.trim();
      await this.processPrompt(prompt);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.core.ui.hideAllUIElements();
    }
  }

  async handleRegenerateButtonClick(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (this.isLoading) return;
    this.isLoading = true;
    
    if (this.core.ui.resultContainer) {
      this.core.ui.resultContainer.classList.add('regenerating');
    }
    
    this.core.animation.showLoadingState(this.core.selection.editIconPosition);
    
    if (this.core.ui.loadingIndicator) {
      this.core.ui.loadingIndicator.classList.add('regenerate-animation');
    }
    
    try {
      const prompt = this.core.ui.promptInput?.value.trim() || '';
      const apiResult = await this.core.api.fetchGeneratedText(this.core.selection.selectedText, prompt);
      this.generatedText = apiResult;
      
      this.core.animation.positionResultContainer(this.core.selection.editIconPosition); 
      this.core.content.renderGeneratedContent(this.generatedText);
      
      this.core.animation.animateTransitionToResult();
    } catch (err) {
      this.core.animation.handleApiError(err, this.core.selection.editIconPosition); 
    } finally {
      if (this.core.ui.resultContainer) {
        this.core.ui.resultContainer.classList.remove('regenerating');
      }
      if (this.core.ui.loadingIndicator) {
        this.core.ui.loadingIndicator.classList.remove('regenerate-animation');
      }
      
      this.core.animation.resetLoadingState();
      this.isLoading = false;
    }
  }
  
  handleReplaceButtonClick(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!this.core.selection.currentRange || !this.generatedText) {
      return;
    }

    this.core.selection.currentRange.deleteContents();
    const textNode = document.createTextNode(this.generatedText);
    this.core.selection.currentRange.insertNode(textNode);

    if (this.core.selection.currentRange.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
      this.core.selection.currentRange.commonAncestorContainer.normalize();
    }

    this.core.ui.hideAllUIElements();
    this.generatedText = '';
    this.isLoading = false;
  }

  handleClickOutside(event) {
    if (!event || !event.target) return;

    const isClickInsideUI = this.core.ui.isClickInsideComponent(event);

    if (!isClickInsideUI) {
      this.core.ui.hideAllUIElements();
    }
  }

  handleGenerateButtonClick(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (this.isLoading) return;
    
    const prompt = this.core.ui.promptInput.value.trim();
    if (!prompt) return;
    
    this.core.ui.animateToLoadingState();
    
    setTimeout(() => {
      this.processPrompt(prompt);
    }, 300);
  }
}

export default InteractionHandler;