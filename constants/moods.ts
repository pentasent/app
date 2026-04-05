export type MoodTag = 'happy' | 'calm' | 'neutral' | 'sad' | 'anxious' | 'tired';

export interface MoodConfig {
    tag: MoodTag;
    label: string;
    emoji: string;
    score: number;
    color: string;
}

export const MOODS: MoodConfig[] = [
    { tag: 'happy', label: 'Happy', emoji: '😊', score: 5, color: '#FFD700' },
    { tag: 'calm', label: 'Calm', emoji: '😌', score: 4, color: '#A8DADC' },
    { tag: 'neutral', label: 'Neutral', emoji: '😐', score: 3, color: '#BDBDBD' },
    { tag: 'sad', label: 'Sad', emoji: '😔', score: 1, color: '#457B9D' },
    { tag: 'anxious', label: 'Anxious', emoji: '😰', score: 2, color: '#E9C46A' },
    { tag: 'tired', label: 'Tired', emoji: '😴', score: 2, color: '#6D6875' },
];

export const ENERGY_LEVELS = [
    { value: 1, label: 'Very Low' },
    { value: 2, label: 'Low' },
    { value: 3, label: 'Normal' },
    { value: 4, label: 'High' },
    { value: 5, label: 'Very High' },
];

export const STRESS_LEVELS = [
    { value: 1, label: 'Very Low' },
    { value: 2, label: 'Low' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'High' },
    { value: 5, label: 'Very High' },
];

export const SLEEP_QUALITY = [
    { value: 1, label: 'Very Bad' },
    { value: 2, label: 'Poor' },
    { value: 3, label: 'Okay' },
    { value: 4, label: 'Good' },
    { value: 5, label: 'Great' },
];

export type SuggestionAction = 'meditate' | 'breathing' | 'sleep' | 'listen' | 'journal' | 'read' | 'chat';

export interface Suggestion {
    action: SuggestionAction;
    message: string;
    buttonText: string;
    tab: string;
    route: string;
}

export const SUGGESTIONS: Record<SuggestionAction, Suggestion> = {
    breathing: {
        action: 'breathing',
        message: "You're feeling stressed. Try a short breathing session.",
        buttonText: "Start Breathing",
        tab: "Breathing",
        route: "/meditation"
    },
    sleep: {
        action: 'sleep',
        message: "Rest is important. A sleep session could help.",
        buttonText: "Sleep Better",
        tab: "Sleep",
        route: "/meditation" // Adjust based on app structure
    },
    meditate: {
        action: 'meditate',
        message: "A short meditation may help you reset.",
        buttonText: "Start Meditation",
        tab: "Meditation",
        route: "/meditation"
    },
    listen: {
        action: 'listen',
        message: "Relax with calming beats.",
        buttonText: "Play Beats",
        tab: "Beats",
        route: "/beats"
    },
    journal: {
        action: 'journal',
        message: "Capture this moment in your journal.",
        buttonText: "Write Journal",
        tab: "Journal",
        route: "/journal"
    },
    read: {
        action: 'read',
        message: "Read something mindful today.",
        buttonText: "Read Article",
        tab: "Articles",
        route: "/articles"
    },
    chat: {
        action: 'chat',
        message: "Talk to someone in the community.",
        buttonText: "Open Chats",
        tab: "Community",
        route: "/chat"
    }
};

export function getSuggestionRule(moodScore: number, energy: number, stress: number, sleep: number): SuggestionAction {
    if (stress >= 4) return "breathing";
    if (sleep <= 2) return "sleep";
    if (moodScore <= 2 && energy <= 2) return "meditate";
    if (moodScore <= 3 && energy <= 2) return "listen";
    if (moodScore >= 4 && energy >= 3) return "journal";
    return "read";
}
