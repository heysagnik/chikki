import { MarkdownProcessor } from './modules/markdown.js';
import { ApiService } from './modules/api.js';
import { PositionManager } from './modules/position.js';
import { UIManager } from './modules/ui-manager.js';
import { SelectionManager } from './modules/selection-manager.js';
import { InteractionHandler } from './modules/interaction-handler.js';
import { AnimationManager } from './modules/animation-manager.js';
import { ContentProcessor } from './modules/content-processor.js';


class Chikki {
  constructor() {
    this.init();
  }
  init(){
    try {
    this.markdown = new MarkdownProcessor();
    this.api = new ApiService();
    this.positionManager = new PositionManager();
    this.ui = new UIManager(this);
    this.selection = new SelectionManager(this);
    this.content = new ContentProcessor(this);
    this.interaction = new InteractionHandler(this);
    this.animation = new AnimationManager(this);

    this.ui.createUIElements();
      this.interaction.setupEventListeners();
      
      console.log("Chikki extension loaded");
    } catch (error) {
      console.error("Error initializing Chikki:", error);
    }
  }

  resetState() {
    try {
      this.selection.selectedText = '';
      this.interaction.generatedText = '';
      this.selection.currentSelection = null;
      this.selection.currentRange = null;
      this.interaction.isLoading = false;
      
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