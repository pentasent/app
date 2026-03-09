/**
 * Parses content from the database which can be:
 * 1. A plain string (Legacy)
 * 2. A JSON string (Legacy/Transition)
 * 3. A structured JSON object (Standard ProseMirror-like format)
 * 
 * Returns a plain text string for rendering in React Native <Text> components.
 */
export const parseContent = (content: any): string => {
    if (!content) return '';

    // Case 1: Already a string
    if (typeof content === 'string') {
        const trimmed = content.trim();
        // Check if it's a JSON string
        if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
            try {
                const parsed = JSON.parse(content);
                return extractTextFromDoc(parsed);
            } catch (e) {
                // If parse fails, treat as plain text
                return content;
            }
        }
        return content;
    }

    // Case 2: Object (JSONB)
    return extractTextFromDoc(content);
};

/**
 * Recursive helper to extract text from a ProseMirror-like document structure.
 */
const extractTextFromDoc = (doc: any): string => {
    if (!doc) return '';

    // If it's a text node
    if (doc.type === 'text' && typeof doc.text === 'string') {
        return doc.text;
    }

    // If it has content (paragraph, doc, etc.)
    if (Array.isArray(doc.content)) {
        return doc.content
            .map((node: any) => extractTextFromDoc(node))
            .join(doc.type === 'doc' ? '\n' : ''); // Newline for blocks, join empty for inline
    }

    // Fallback if structure is unknown but has text property
    if (typeof doc.text === 'string') return doc.text;

    return '';
};
