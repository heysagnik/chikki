// Tone Popup UI and logic module

let tonePopup = null;
let toneDot = null;
let loadingSkeleton = null;

export function openTonePopupAt(x, y, selectedTextForTone, selectedRange, onReplace) {
    closeTonePopup();

    tonePopup = document.createElement('div');
    tonePopup.className = 'tone-popup';
    tonePopup.style.position = 'absolute';
    tonePopup.style.zIndex = '100000';
    tonePopup.style.width = '240px';
    tonePopup.style.background = 'hsl(240, 10%, 3.9%)';
    tonePopup.style.borderRadius = '8px';
    tonePopup.style.boxShadow = '0px 10px 38px -10px hsla(240, 30%, 5%, 0.35), 0px 10px 20px -15px hsla(240, 30%, 5%, 0.2)';
    tonePopup.style.border = '1px solid hsl(240, 5%, 12%)';
    tonePopup.style.display = 'flex';
    tonePopup.style.flexDirection = 'column';
    tonePopup.style.padding = '16px';
    tonePopup.style.color = 'hsl(0, 0%, 98%)';
    tonePopup.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
    tonePopup.style.fontSize = '14px';
    tonePopup.style.gap = '12px';

    // Header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '4px';

    const title = document.createElement('div');
    title.textContent = 'Adjust tone';
    title.style.fontWeight = '500';
    title.style.fontSize = '14px';
    title.style.color = 'hsl(0, 0%, 98%)';
    title.style.letterSpacing = '-0.01em';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'hsl(240, 5%, 65%)';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '4px';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.transition = 'background-color 150ms, color 150ms';
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = 'hsl(240, 5%, 12%)';
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';
    closeBtn.onclick = closeTonePopup;

    header.appendChild(title);
    header.appendChild(closeBtn);
    tonePopup.appendChild(header);

    // Tone Picker Grid
    const picker = document.createElement('div');
    picker.className = 'tone-picker';
    picker.style.position = 'relative';
    picker.style.width = '100%';
    picker.style.aspectRatio = '1 / 1';
    picker.style.display = 'grid';
    picker.style.gridTemplateRows = 'repeat(3, 1fr)';
    picker.style.gridTemplateColumns = 'repeat(3, 1fr)';
    picker.style.backgroundColor = 'hsl(240, 5%, 10%)';
    picker.style.borderRadius = '6px';
    picker.style.cursor = 'pointer';
    picker.style.overflow = 'hidden';
    picker.style.userSelect = 'none';

    // Create grid cells
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.style.border = '1px solid hsl(240, 5%, 15%)';
        cell.style.transition = 'background-color 150ms';
        cell.dataset.index = i;
        cell.addEventListener('click', (e) => handleToneCellClick(e, i));
        cell.addEventListener('mouseover', () => cell.style.backgroundColor = 'hsla(240, 5%, 15%, 0.5)');
        cell.addEventListener('mouseout', () => cell.style.backgroundColor = 'transparent');
        picker.appendChild(cell);
    }

    // Axis labels with shadcn style
    const labels = [
        { text: 'Professional', x: 1, y: 0, align: 'center', valign: 'top' },
        { text: 'Casual', x: 1, y: 2, align: 'center', valign: 'bottom' },
        { text: 'Concise', x: 0, y: 1, align: 'left', valign: 'middle' },
        { text: 'Expanded', x: 2, y: 1, align: 'right', valign: 'middle' }
    ];
    
    labels.forEach(l => {
        const label = document.createElement('span');
        label.textContent = l.text;
        label.style.position = 'absolute';
        label.style.fontSize = '12px';
        label.style.color = 'hsl(240, 5%, 65%)';
        label.style.fontWeight = '500';
        label.style.padding = '6px';
        
        if (l.align === 'center') {
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
        } else if (l.align === 'left') {
            label.style.left = '0';
        } else {
            label.style.right = '0';
        }
        
        if (l.valign === 'middle') {
            label.style.top = '50%';
            label.style.transform += ' translateY(-50%)';
        } else if (l.valign === 'top') {
            label.style.top = '0';
        } else {
            label.style.bottom = '0';
        }
        
        picker.appendChild(label);
    });

    // Dot indicator with shadcn style
    toneDot = document.createElement('div');
    toneDot.className = 'tone-dot';
    toneDot.style.position = 'absolute';
    toneDot.style.width = '16px';
    toneDot.style.height = '16px';
    toneDot.style.background = 'hsl(9, 100%, 64%)';
    toneDot.style.border = '2px solid hsl(0, 0%, 100%)';
    toneDot.style.borderRadius = '50%';
    toneDot.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.15)';
    toneDot.style.transform = 'translate(-50%, -50%)';
    toneDot.style.zIndex = '10';
    picker.appendChild(toneDot);

    tonePopup.appendChild(picker);

    // Preset options with shadcn style
    const presetSection = document.createElement('div');
    presetSection.style.display = 'flex';
    presetSection.style.flexDirection = 'column';
    presetSection.style.gap = '8px';

    const presetLabel = document.createElement('div');
    presetLabel.textContent = 'Quick presets';
    presetLabel.style.fontSize = '12px';
    presetLabel.style.color = 'hsl(240, 5%, 65%)';
    presetLabel.style.fontWeight = '500';
    presetSection.appendChild(presetLabel);

    const presetGrid = document.createElement('div');
    presetGrid.style.display = 'grid';
    presetGrid.style.gridTemplateColumns = '1fr 1fr';
    presetGrid.style.gap = '8px';

    const presets = ['Executive', 'Technical', 'Basic', 'Educational'];
    presets.forEach(preset => {
        const btn = document.createElement('button');
        btn.textContent = preset;
        btn.style.padding = '6px 12px';
        btn.style.backgroundColor = 'hsl(240, 5%, 12%)';
        btn.style.border = '1px solid hsl(240, 5%, 20%)';
        btn.style.borderRadius = '4px';
        btn.style.color = 'hsl(0, 0%, 96%)';
        btn.style.fontSize = '12px';
        btn.style.fontWeight = '500';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'background-color 150ms, border-color 150ms';
        btn.addEventListener('mouseover', () => {
            btn.style.backgroundColor = 'hsl(240, 5%, 16%)';
        });
        btn.addEventListener('mouseout', () => {
            btn.style.backgroundColor = 'hsl(240, 5%, 12%)';
        });
        btn.addEventListener('click', () => handlePresetClick(preset));
        presetGrid.appendChild(btn);
    });

    presetSection.appendChild(presetGrid);
    tonePopup.appendChild(presetSection);

    // Result area with shadcn style
    loadingSkeleton = document.createElement('div');
    loadingSkeleton.className = 'loading-skeleton';
    loadingSkeleton.style.width = '100%';
    loadingSkeleton.style.height = '38px';
    loadingSkeleton.style.background = 'linear-gradient(90deg, hsl(240, 5%, 12%) 25%, hsl(240, 5%, 16%) 50%, hsl(240, 5%, 12%) 75%)';
    loadingSkeleton.style.backgroundSize = '200% 100%';
    loadingSkeleton.style.borderRadius = '4px';
    loadingSkeleton.style.display = 'none';
    tonePopup.appendChild(loadingSkeleton);

    const resultArea = document.createElement('div');
    resultArea.className = 'tone-result';
    resultArea.style.width = '100%';
    resultArea.style.minHeight = '38px';
    resultArea.style.fontSize = '14px';
    resultArea.style.lineHeight = '1.5';
    resultArea.style.textAlign = 'left';
    resultArea.style.display = 'none';
    resultArea.style.wordBreak = 'break-word';
    resultArea.style.color = 'hsl(0, 0%, 96%)';
    resultArea.style.backgroundColor = 'hsl(240, 5%, 10%)';
    resultArea.style.padding = '8px 10px';
    resultArea.style.borderRadius = '4px';
    resultArea.style.border = '1px solid hsl(240, 5%, 20%)';
    resultArea.style.maxHeight = '120px';
    resultArea.style.overflowY = 'auto';
    resultArea.style.scrollbarWidth = 'thin';
    resultArea.style.scrollbarColor = 'hsl(240, 5%, 30%) transparent';
    tonePopup.appendChild(resultArea);

    const insertBtn = document.createElement('button');
    insertBtn.textContent = 'Replace selection';
    insertBtn.style.marginTop = '4px';
    insertBtn.style.background = 'hsl(224, 82%, 56%)';
    insertBtn.style.color = 'white';
    insertBtn.style.border = 'none';
    insertBtn.style.borderRadius = '4px';
    insertBtn.style.padding = '8px 0';
    insertBtn.style.cursor = 'pointer';
    insertBtn.style.fontSize = '14px';
    insertBtn.style.fontWeight = '500';
    insertBtn.style.width = '100%';
    insertBtn.style.display = 'none';
    insertBtn.style.transition = 'background-color 150ms';
    insertBtn.disabled = true;
    insertBtn.onmouseover = () => {
        if (!insertBtn.disabled) insertBtn.style.backgroundColor = 'hsl(224, 82%, 51%)';
    };
    insertBtn.onmouseout = () => {
        if (!insertBtn.disabled) insertBtn.style.backgroundColor = 'hsl(224, 82%, 56%)';
    };
    insertBtn.onclick = () => {
        if (selectedRange && resultArea.textContent) {
            onReplace(resultArea.textContent);
            closeTonePopup();
        }
    };
    tonePopup.appendChild(insertBtn);

    // Position popup near magic band
    tonePopup.style.left = `${x - 100}px`;
    tonePopup.style.top = `${y + 12}px`;

    document.body.appendChild(tonePopup);

    // Set initial dot position to center
    setToneDotPosition(1, 1, picker);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('mousedown', outsideTonePopupClick);
    }, 0);

    // --- Tone logic ---
    function handleToneCellClick(e, index) {
        const col = index % 3;
        const row = Math.floor(index / 3);
        setToneDotPosition(col, row, picker);
        let tone;
        if (row === 0 && col === 0) tone = "professional and concise";
        else if (row === 0 && col === 1) tone = "professional";
        else if (row === 0 && col === 2) tone = "professional and expanded";
        else if (row === 1 && col === 0) tone = "concise";
        else if (row === 1 && col === 1) tone = "neutral";
        else if (row === 1 && col === 2) tone = "expanded";
        else if (row === 2 && col === 0) tone = "casual and concise";
        else if (row === 2 && col === 1) tone = "casual";
        else if (row === 2 && col === 2) tone = "casual and expanded";
        triggerToneChange(tone);
    }
    
    function handlePresetClick(preset) {
        let tone = preset.toLowerCase();
        switch(preset) {
            case 'Executive':
                setToneDotPosition(0, 0, picker);
                break;
            case 'Technical':
                setToneDotPosition(2, 0, picker);
                break;
            case 'Basic':
                setToneDotPosition(0, 2, picker);
                break;
            case 'Educational':
                setToneDotPosition(2, 2, picker);
                break;
        }
        triggerToneChange(tone);
    }
    
    function setToneDotPosition(col, row, picker) {
        const cellWidth = picker.clientWidth / 3;
        const cellHeight = picker.clientHeight / 3;
        const x = (col + 0.5) * cellWidth;
        const y = (row + 0.5) * cellHeight;
        toneDot.style.left = `${x}px`;
        toneDot.style.top = `${y}px`;
    }
    
    function triggerToneChange(tone) {
        loadingSkeleton.style.display = 'block';
        resultArea.style.display = 'none';
        insertBtn.style.display = 'none';
        chrome.runtime.sendMessage(
            {
                action: 'performAiAction_changeTone',
                data: { text: selectedTextForTone, tone }
            },
            (response) => {
                loadingSkeleton.style.display = 'none';
                resultArea.style.display = 'block';
                if (response && response.success && response.data) {
                    resultArea.textContent = response.data;
                    insertBtn.disabled = false;
                    insertBtn.style.display = 'block';
                } else {
                    resultArea.textContent = response?.error || 'Failed to generate text.';
                }
            }
        );
    }
}

export function closeTonePopup() {
    if (tonePopup) {
        tonePopup.remove();
        tonePopup = null;
        document.removeEventListener('mousedown', outsideTonePopupClick);
    }
}

function outsideTonePopupClick(e) {
    if (tonePopup && !tonePopup.contains(e.target)) {
        closeTonePopup();
    }
}