export class PositionManager {
  constructor() {}
  
  adjustPositionForViewport(desiredTop, desiredLeft, elementWidth, elementHeight) {
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const margin = 16;

    const adaptedWidth = Math.min(elementWidth, viewportWidth - (margin * 2));

    let adjustedLeft = Math.max(scrollX + margin, desiredLeft);
    adjustedLeft = Math.min(adjustedLeft, scrollX + viewportWidth - adaptedWidth - margin);

    let adjustedTop = Math.max(scrollY + margin, desiredTop);
    adjustedTop = Math.min(adjustedTop, scrollY + viewportHeight - elementHeight - margin);

    return { 
      top: adjustedTop, 
      left: adjustedLeft,
      width: adaptedWidth
    };
  }
  
  calculateEditIconPosition(selectionRect) {
    const iconSize = 40;
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    
    let desiredTop = scrollY + selectionRect.bottom + 8;
    let desiredLeft = scrollX + selectionRect.left + (selectionRect.width / 2) - (iconSize / 2);

    if (desiredTop + iconSize + 8 > scrollY + (window.innerHeight || document.documentElement.clientHeight)) {
      desiredTop = scrollY + selectionRect.top - iconSize - 8;
    }

    const adjustedPosition = this.adjustPositionForViewport(desiredTop, desiredLeft, iconSize, iconSize);

    return { 
      top: adjustedPosition.top, 
      left: adjustedPosition.left, 
      width: iconSize, 
      height: iconSize 
    };
  }
}

export default PositionManager;