export class MarkdownProcessor {
  constructor() {}
  
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

  sanitizeHTML(text) {
    if (!text) return '';
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export default MarkdownProcessor;