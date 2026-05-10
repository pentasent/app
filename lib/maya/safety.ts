export type SafetyCategory = 'abuse' | 'self_harm' | 'medical' | 'sexual' | 'violence' | 'illegal' | 'out_of_scope' | null;

const BLOCKED_WORDS = {
    abuse: ['fuck', 'asshole', 'bitch', 'idiot', 'stupid', 'fuck you', 'you idiot', 'stupid bitch', 'fuck off', 'fuck me', 'how to fuck'],
    medical: ['drug', 'diagnose', 'prescription', 'pills', 'surgery', 'how to drug', 'how to diagnose', 'how to get prescription', 'how to get pills', 'how to get surgery'],
    self_harm: ['suicide', 'kill myself', 'hurt myself', 'end my life', 'cutting', 'self harm', 'how to kill myself', 'how to hurt myself', 'how to end my life', 'how to cut myself', 'how to commit suicide', 'how to commit self harm', 'how to commit hurt myself', 'how to commit end my life', 'how to commit cutting'],
    sexual: ['porn', 'naked', 'explicit', 'nude', 'porn', 'explicit video', 'nude images', 'sex video', 'sex images', 'how to get porn', 'how to get naked', 'how to get explicit', 'how to get nude', 'how to get porn', 'how to get explicit video', 'how to get nude images', 'how to get sex video', 'how to get sex images'],
    violence: ['kill', 'murder', 'fight', 'attack', 'weapon', 'gun', 'bomb', 'how to kill', 'how to murder', 'shoot someone', 'how to shoot someone'],
    illegal: ['steal', 'rob', 'hack', 'drugs', 'weed', 'cocaine', 'fraud', 'how to hack', 'how to steal', 'fraud plan', 'buy drugs', 'how to get drugs', 'how to get weed', 'how to get cocaine', 'how to get fraud', 'how to get fraud plan', 'how to get buy drugs'],
};

export const getSafetyCategory = (text: string): SafetyCategory => {
    const lower = text.toLowerCase();
    
    if (BLOCKED_WORDS.self_harm.some(w => lower.includes(w))) return 'self_harm';
    if (BLOCKED_WORDS.medical.some(w => lower.includes(w))) return 'medical';
    if (BLOCKED_WORDS.sexual.some(w => lower.includes(w))) return 'sexual';
    if (BLOCKED_WORDS.violence.some(w => lower.includes(w))) return 'violence';
    if (BLOCKED_WORDS.illegal.some(w => lower.includes(w))) return 'illegal';
    if (BLOCKED_WORDS.abuse.some(w => lower.includes(w))) return 'abuse';
    
    // Out of scope check - basics
    const wellnessRelated = ['stress', 'sleep', 'meditate', 'yoga', 'fitness', 'feel', 'anxious', 'routine', 'habit', 'wellness'];
    const clearlyOut = ['programming', 'coding', 'politics', 'election', 'history', 'stock market', 'crypto', 'math'];
    
    if (clearlyOut.some(w => lower.includes(w)) && !wellnessRelated.some(w => lower.includes(w))) {
        return 'out_of_scope';
    }

    return null;
};

export const getSafetyResponse = (category: SafetyCategory): string => {
  switch (category) {
    case 'abuse':
      return "I'm here to support you. Let's talk about what's really going on.";

    case 'medical':
      return "I can share general wellness guidance, but for medical concerns it's best to consult a professional. Want help with managing how you're feeling in the meantime?";

    case 'self_harm':
      return "I'm really sorry you're feeling this way. You don't have to go through it alone. If you can, consider reaching out to someone you trust or a professional. I’m here with you—do you want to talk about what’s been weighing on you?";

    case 'out_of_scope':
      return "I focus on your mental wellbeing—things like stress, sleep, and clarity. Want to talk about how you're feeling right now?";

    case 'sexual':
      return "I'm here to support your mental wellbeing. If this is about relationships or emotions, I'm happy to help—just let me know what's on your mind.";
    
    case 'violence':
      return "I can't help with harm-related topics. If something is making you feel angry or overwhelmed, we can talk through it together.";
    
    case 'illegal':
      return "I can't help with that, but I'm here for you if you want support with stress, emotions, or anything on your mind.";

    default:
      return "I'm here to support your wellbeing. What's been on your mind lately?";
  }
};