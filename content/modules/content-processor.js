export class ContentProcessor {
  constructor(core) {
    this.core = core;
  }

  renderGeneratedContent(text) {
    try {
      if (!text) {
        return;
      }
      
      const containsMarkdown = /[#*_\[\]`]/.test(text);
      
      if (containsMarkdown) {
        this.renderMarkdown(text);
      } else {
        const sanitizedText = this.sanitizeHTML(text);
        if (this.core.ui.generatedContent) {
          this.core.ui.generatedContent.innerHTML = sanitizedText;
        }
      }
      
      this.core.ui.updateReplaceButtonText(this.core.selection.hasTextSelection);
      if (this.core.ui.resultContainer) {
        this.core.ui.resultContainer.style.display = 'block';
      }
    } catch (error) {
      console.error("Error rendering generated content:", error);
    }
  }

  renderMarkdown(text) {
    try {
      let sanitized = this.sanitizeHTML(text);
      const html = this.core.markdown.parseMarkdown(sanitized);
      if (this.core.ui.generatedContent) {
        this.core.ui.generatedContent.className = 'chikki-markdown';
        this.core.ui.generatedContent.innerHTML = html;
      }
    } catch (error) {
      console.error("Error rendering markdown:", error);
    }
  }

  sanitizeHTML(text) {
    if (!text) return '';
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export default ContentProcessor;