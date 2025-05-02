export class AnimationManager {
  constructor(core) {
    this.core = core;
  }

  showLoadingState(iconPosition) {
    if (this.core.ui.promptInput) {
      this.core.ui.promptInput.style.opacity = '0';
      this.core.ui.promptInput.style.transform = 'translateY(10px)';
    }
    
    if (this.core.ui.promptContainer) {
      this.core.ui.promptContainer.classList.add('loading');
    }

    const loadingWidth = 400;
    const loadingHeight = 180;
    
    if (!iconPosition) {
      if(this.core.ui.promptContainer && this.core.ui.promptContainer.style.display !== 'none') {
        const promptRect = this.core.ui.promptContainer.getBoundingClientRect();
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

    let desiredTop = iconPosition.top;
    let desiredLeft = iconPosition.left + (iconPosition.width / 2) - (loadingWidth / 2);

    const adjustedPosition = this.core.positionManager.adjustPositionForViewport(
      desiredTop, 
      desiredLeft, 
      loadingWidth, 
      loadingHeight
    );

    if (this.core.ui.promptContainer) {
      this.core.ui.promptContainer.style.top = `${adjustedPosition.top}px`;
      this.core.ui.promptContainer.style.left = `${adjustedPosition.left}px`;
      this.core.ui.promptContainer.style.width = `${adjustedPosition.width}px`;
      this.core.ui.promptContainer.style.height = `${loadingHeight}px`;
    }
    
    if (this.core.ui.skeletonContainer) {
      this.core.ui.skeletonContainer.style.display = 'block';
      const skeletonLines = this.core.ui.skeletonContainer.querySelectorAll('.chikki-skeleton-line');
      skeletonLines.forEach(line => line.classList.add('chikki-loading-pulse'));
    }
  }

  resetLoadingState() {
    this.core.interaction.isLoading = false;
    
    if (this.core.ui.promptInput) {
      this.core.ui.promptInput.disabled = false;
      this.core.ui.promptInput.style.opacity = '1';
      this.core.ui.promptInput.style.transform = 'none';
    }
    
    if (this.core.ui.skeletonContainer) {
      this.core.ui.skeletonContainer.style.display = 'none';
    }
  }

  positionResultContainer(iconPosition) {
    const resultWidth = 400; 
    
    if (!iconPosition) return;

    let desiredTop = iconPosition.top;
    let desiredLeft = iconPosition.left + (iconPosition.width / 2) - (resultWidth / 2);

    const adjustedPosition = this.core.positionManager.adjustPositionForViewport(
      desiredTop, desiredLeft, resultWidth, 180
    );

    if (this.core.ui.universalContainer) {
      this.core.ui.universalContainer.style.width = `${adjustedPosition.width}px`;
      this.core.ui.showResultState(this.core.interaction.generatedText);
    }
  }

  animateTransitionToResult() {
    setTimeout(() => {
      if (this.core.ui.resultContainer) {
        this.core.ui.resultContainer.classList.add('active');
      }
      
      setTimeout(() => {
        if (this.core.ui.promptContainer) {
          this.core.ui.promptContainer.classList.remove('active', 'transitioning-out', 'loading');
          this.core.ui.promptContainer.style.display = 'none';
        }
      }, 300);
    }, 50);
  }

  handleApiError(err, iconPosition) {
    this.resetLoadingState();
    this.positionResultContainer(iconPosition);
    
    if (this.core.ui.resultContainer) {
      this.core.ui.resultContainer.innerHTML = '';
      this.core.ui.resultContainer.classList.add('error');
      
      const errorIcon = document.createElement('div');
      errorIcon.className = 'chikki-error-icon';
      errorIcon.innerHTML = '⚠️';
      
      const errorTitle = document.createElement('div');
      errorTitle.className = 'chikki-error-title';
      errorTitle.textContent = 'Error Occurred';
      
      const errorMessage = document.createElement('div');
      errorMessage.className = 'chikki-error-message';
      errorMessage.textContent = err.message || 'Failed to process your request. Please try again.';
      
      const retryButton = document.createElement('button');
      retryButton.className = 'chikki-retry-button';
      retryButton.textContent = 'Try Again';
      retryButton.onclick = () => {
        this.core.ui.hideAllUIElements();
        setTimeout(() => this.core.ui.showPrompt(), 100);
      };
      
      const errorContainer = document.createElement('div');
      errorContainer.className = 'chikki-error-container';
      errorContainer.appendChild(errorIcon);
      errorContainer.appendChild(errorTitle);
      errorContainer.appendChild(errorMessage);
      errorContainer.appendChild(retryButton);
      
      this.core.ui.resultContainer.appendChild(errorContainer);
      this.animateTransitionToResult();
    }
  }
  
  animateRegenerationResult() {
    if (this.core.ui.resultContainer) {
      this.core.ui.resultContainer.classList.remove('regenerating');
      
      const skeletonElements = this.core.ui.resultContainer.querySelectorAll('.chikki-skeleton-line');
      skeletonElements.forEach(element => {
        element.classList.remove('chikki-loading-pulse');
      });
      
      const contentElement = this.core.ui.resultContainer.querySelector('.chikki-result-content');
      if (contentElement) {
        contentElement.style.opacity = '0';
        contentElement.style.display = 'block';
        
        setTimeout(() => {
          contentElement.style.opacity = '1';
        }, 50);
      }
    }
  }

  setupRegenerationLoading(currentResultRect) {
    if (this.core.ui.resultContainer) {
      this.core.ui.resultContainer.classList.add('regenerating');
      
      const contentElement = this.core.ui.resultContainer.querySelector('.chikki-result-content');
      if (contentElement) {
        contentElement.style.opacity = '0';
      }
      
      let skeletonContainer = this.core.ui.resultContainer.querySelector('.chikki-regeneration-skeleton');
      if (!skeletonContainer) {
        skeletonContainer = document.createElement('div');
        skeletonContainer.className = 'chikki-regeneration-skeleton';
        this.core.ui.resultContainer.appendChild(skeletonContainer);
        
        for (let i = 0; i < 5; i++) {
          const line = document.createElement('div');
          line.className = 'chikki-skeleton-line';
          line.style.width = `${Math.floor(50 + Math.random() * 40)}%`;
          skeletonContainer.appendChild(line);
        }
      }
      
      const skeletonLines = skeletonContainer.querySelectorAll('.chikki-skeleton-line');
      skeletonLines.forEach(line => {
        line.classList.add('chikki-loading-pulse');
      });
      
      this.core.ui.resultContainer.style.display = 'flex';
    }
  }
}

export default AnimationManager;