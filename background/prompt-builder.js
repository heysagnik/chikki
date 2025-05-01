export function buildPrompt(actionType, data) {
    const { text, tone, context, language } = data;

    switch (actionType) {
        case 'fixGrammar':
            return `Correct the grammar and spelling errors in the following text. Only output the corrected text:\n\n"${text}"`;

        case 'changeTone':
            if (!tone) return null;
            return `Rewrite the following text in a ${tone} tone. Only output the rewritten text:\n\n"${text}"`;

        case 'findInfo':
            return `Based on the following text, provide relevant information, key concepts, or related case studies. If possible, suggest search terms to find detailed sources:\n\nContext: ${context || 'General writing'}\n\nText: "${text}"`;

        case 'autocomplete':
            return `Continue the following text naturally:\n\n"${text}"`;

        case 'rewrite':
            return `Rewrite the following text to improve clarity and flow. Only output the rewritten text:\n\n"${text}"`;

        case 'explain':
            return `Explain the following text simply:\n\n"${text}"`;

        case 'translate':
            if (!language) return null;
            return `Translate the following text to ${language}. Only output the translation:\n\n"${text}"`;

        default:
            return null;
    }
}