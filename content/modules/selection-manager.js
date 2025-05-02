export class SelectionManager {
  constructor(core) {
    this.core = core;
    this.selectedText = '';
    this.currentSelection = null;
    this.currentRange = null;
    this.hasTextSelection = false;
    this.editIconPosition = null;
  }

  handleTextSelection(event) {
    if (event && this.core.ui.isClickInsideComponent(event)) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        this.core.ui.hideEditIcon();
        this.hasTextSelection = false;
        this.core.ui.updateReplaceButtonText(this.hasTextSelection);
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();

      if (range.collapsed || !selectedText || selectedText.length === 0) {
        this.hasTextSelection = false;
        if (!this.core.ui.promptContainer?.classList.contains('active') && 
            !this.core.ui.resultContainer?.classList.contains('active')) {
           this.core.ui.hideEditIcon();
        }
        this.core.ui.updateReplaceButtonText(this.hasTextSelection);
        return;
      }

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
        this.hasTextSelection = false;
        if (!this.core.ui.promptContainer?.classList.contains('active') && 
            !this.core.ui.resultContainer?.classList.contains('active')) {
           this.core.ui.hideEditIcon();
        }
        this.core.ui.updateReplaceButtonText(this.hasTextSelection);
        return;
      }

      this.hasTextSelection = true;
      if (this.shouldUpdateSelection(selectedText)) {
        this.updateSelectionData(selectedText, selection);
      }
      this.core.ui.updateReplaceButtonText(this.hasTextSelection);
    }, 50);
  }

  shouldUpdateSelection(selectedText) {
    return selectedText && (
      selectedText !== this.selectedText || 
      (this.core.ui.editIcon && this.core.ui.editIcon.style.display === 'none' &&
      this.core.ui.promptContainer && !this.core.ui.promptContainer.classList.contains('active') &&
      this.core.ui.resultContainer && !this.core.ui.resultContainer.classList.contains('active'))
    );
  }

  updateSelectionData(selectedText, selection) {
    this.selectedText = selectedText;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width > 0 || rect.height > 0) {
      this.hasTextSelection = selectedText.length > 0;
      this.currentSelection = selection;
      this.currentRange = range.cloneRange();
      
      if (this.core.ui.container) {
        this.core.ui.container.style.display = 'block';
      }
      this.positionEditIcon(rect);
      this.core.ui.updateReplaceButtonText(this.hasTextSelection);
    } else {
      this.core.ui.hideAllUIElements();
    }
  }

  positionEditIcon(rect) {
    const iconSize = 40;
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    
    let desiredTop = scrollY + rect.bottom + 8;
    let desiredLeft = scrollX + rect.left + (rect.width / 2) - (iconSize / 2);

    if (desiredTop + iconSize + 8 > scrollY + (window.innerHeight || document.documentElement.clientHeight)) {
      desiredTop = scrollY + rect.top - iconSize - 8;
    }

    const adjustedPosition = this.core.positionManager.adjustPositionForViewport(desiredTop, desiredLeft, iconSize, iconSize);

    this.editIconPosition = { 
      top: adjustedPosition.top, 
      left: adjustedPosition.left, 
      width: iconSize, 
      height: iconSize 
    };
    
    if (this.core.ui.editIcon) {
      this.core.ui.editIcon.style.top = `${adjustedPosition.top}px`;
      this.core.ui.editIcon.style.left = `${adjustedPosition.left}px`;
      this.core.ui.editIcon.style.display = 'flex';
      this.core.ui.editIcon.classList.remove('expanding');
    }

    if (this.core.ui.promptContainer) {
      this.core.ui.promptContainer.classList.remove('active', 'transitioning-out');
      this.core.ui.promptContainer.style.display = 'none';
    }
    
    if (this.core.ui.resultContainer) {
      this.core.ui.resultContainer.classList.remove('active');
      this.core.ui.resultContainer.style.display = 'none';
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
    } catch {
      return true;
    }
  }
}

export default SelectionManager;