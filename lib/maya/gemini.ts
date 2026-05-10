// Cloudflare Worker API for Maya (Fetched from Env)
const WORKER_URL = process.env.EXPO_PUBLIC_MAYA_WORKER_URL || "https://ai.pentasent.workers.dev";

/**
 * Enhanced instructions to ensure full, well-formatted responses.
 * Enforces paragraphs and clear Markdown structure.
 */
const FORMAT_INSTRUCTIONS = `

(FORMATTING RULES: 
1. Provide a comprehensive response, avoid cutting short. Don't worry about character limits.
2. Structure your response into clear, manageable paragraphs.
3. Use **bold** for key concepts and *italics* for empathetic phrases.
4. Use bullet points (-) for steps or tips.
5. Use clear spacing between paragraphs for readability.
)`;

export interface MayaHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

export const getMayaResponse = async (message: string, history: MayaHistoryItem[]) => {
    try {
        // Prepend instructions to ensure rich formatting and length
        const enrichedMessage = message + FORMAT_INSTRUCTIONS;

        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: enrichedMessage,
                history
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data.reply;
    } catch (error) {
        console.error('Maya AI Error:', error);
        throw error;
    }
};

/**
 * Generate a short title using the same worker
 * by sending a specialized prompt
 */
export const generateChatTitle = async (message: string) => {
    try {
        const prompt = `Generate a very short title (max 5 words) for a wellness chat starting with this message: "${message}". Respond ONLY with the title without quotes and without any explanation.`;
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt, history: [] })
        });
        const data = await response.json();
        return data.reply.trim().replace(/^"|"$/g, '') || "Wellness Chat";
    } catch (e) {
        return "Wellness Chat";
    }
};

/**
 * Detect mood and intent using the same worker
 */
export const detectMoodAndIntent = async (message: string) => {
    try {
        const prompt = `Analyze this message: "${message}". Detect:
1. Mood (happy, calm, stressed, anxious, sad, angry, tired, lonely, motivated, neutral)
2. Intent (meditation, sleep, stress, anxiety, fitness, yoga, journaling, motivation, breathing, habit, general_chat)
Return ONLY a valid JSON object like: {"mood": "...", "intent": "..."}. Do not include any other text.`;
        
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt, history: [] })
        });
        const data = await response.json();
        const text = data.reply;
        const jsonMatch = text.match(/\{.*\}/s);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { mood: 'neutral', intent: 'general_chat' };
    } catch (e) {
        return { mood: 'neutral', intent: 'general_chat' };
    }
};
