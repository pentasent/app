import { supabase } from '../supabase';
import { MayaChat, MayaMessage, Plan, UserSubscription } from '../../types/database';
import { getSafetyCategory, getSafetyResponse } from './safety';
import { getMayaResponse, generateChatTitle, detectMoodAndIntent, MayaHistoryItem } from './gemini';

export const MayaService = {
  /**
   * Fetches user's active plan and its limits
   */
  /**
   * Internal helper to validate subscription status against end_date
   */
  async validateSubscription(sub: any): Promise<any> {
    if (!sub || sub.status !== 'active' || !sub.end_date) return sub;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const end = new Date(sub.end_date);
    const expirationDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    // If today is past the expiration date, it's expired
    if (today > expirationDate) {
      const { data: updatedSub } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString() 
        })
        .eq('id', sub.id)
        .select('*, plan:plans(*)')
        .single();
      
      return updatedSub || { ...sub, status: 'expired' };
    }

    return sub;
  },

  /**
   * Fetches user's active plan and its limits
   */
  async getUserPlan(userId: string): Promise<Plan | null> {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('id, status, end_date, plan:plans(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const validatedSub = await this.validateSubscription(sub);

    if (validatedSub && validatedSub.status === 'active' && validatedSub.plan) {
      return (validatedSub as any).plan as Plan;
    }

    // Default to Free plan if none found or inactive
    const { data: freePlan } = await supabase
      .from('plans')
      .select('*')
      .eq('name', 'Free')
      .maybeSingle();

    return freePlan as Plan;
  },

  /**
   * Checks if user can create a new chat today based on their plan
   */
  async checkDailyQuota(userId: string) {
    const today = new Date().toISOString().split('T')[0];
 
    // Fetch plan, usage, and total history in parallel
    const [planRes, usageRes, totalHistory] = await Promise.all([
      this.getUserPlan(userId),
      supabase
        .from('maya_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('maya_chats')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    ]);
 
    const plan = planRes;
    const usage = usageRes.data;
    const totalCount = totalHistory.count || 0;
 
    // Use -1 for unlimited
    let limit = plan?.limits.maya.chats_per_day ?? 1;
    
    // Bypass: Complementary gift if 0 history and 0 plan limit
    const isComplementaryEligible = limit === 0 && totalCount === 0;
 
    if (limit !== -1 && usage && usage.chats_created >= limit && !isComplementaryEligible) {
      return { allowed: false, remaining: 0, planName: plan?.name };
    }
    return {
      allowed: true,
      remaining: limit === -1 ? 999 : (isComplementaryEligible ? 1 : limit - (usage?.chats_created || 0)),
      planName: plan?.name
    };
  },

  /**
   * Creates a new Maya chat session
   */
  async createChat(userId: string, chatId?: string) {
    const { allowed, planName } = await this.checkDailyQuota(userId);
    if (!allowed) {
      throw new Error('UPGRADE_REQUIRED_CHATS');
    }

    const insertData: any = {
      user_id: userId,
      title: 'New Wellness Chat',
      message_count: 0,
      status: 'active',
      last_message_at: new Date().toISOString()
    };

    if (chatId) {
      insertData.id = chatId;
    }

    const { data: chat, error } = await supabase
      .from('maya_chats')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // Increment usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
      .from('maya_usage')
      .select('id, chats_created')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (usage) {
      await supabase.from('maya_usage').update({ chats_created: usage.chats_created + 1 }).eq('id', usage.id);
    } else {
      await supabase.from('maya_usage').insert({ user_id: userId, date: today, chats_created: 1, messages_sent: 0 });
    }

    return chat as MayaChat;
  },

  /**
   * Sends a message to Maya and gets a response
   */
  async sendMessage(chatId: string, userId: string, text: string) {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch current chat and plan in parallel
    const [chatRes, planRes] = await Promise.all([
      supabase.from('maya_chats').select('*').eq('id', chatId).single(),
      this.getUserPlan(userId)
    ]);

    const chat = chatRes.data;
    const plan = planRes;
 
    if (!chat) throw new Error('Could not find the conversation.');
 
    const planChatsPerDay = plan?.limits.maya.chats_per_day ?? 1;
    const msgLimit = planChatsPerDay === 0 ? 2 : (plan?.limits.maya.messages_per_chat ?? 30);
 
    if (msgLimit !== -1 && chat.message_count >= msgLimit) {
      throw new Error('UPGRADE_REQUIRED_MESSAGES');
    }

    // 2. Safety Filter
    const safetyCategory = getSafetyCategory(text);
    if (safetyCategory) {
      // Log Safety violation
      await supabase.from('maya_safety_logs').insert({
        user_id: userId,
        chat_id: chatId,
        message: text,
        category: safetyCategory
      });

      const safetyResponse = getSafetyResponse(safetyCategory);

      // Save user message (flagged)
      await supabase.from('maya_messages').insert({
        chat_id: chatId,
        sender: 'user',
        message_text: text,
        flagged: true,
        message_json: { safety_category: safetyCategory }
      });

      // Save system/maya response (flagged)
      const { data: mayaMsg } = await supabase.from('maya_messages').insert({
        chat_id: chatId,
        sender: 'maya',
        message_text: safetyResponse,
        flagged: true,
        message_json: { safety_category: safetyCategory }
      }).select().single();

      // Increment message count (one user interaction)
      await supabase.from('maya_chats').update({
        message_count: chat.message_count + 1,
        last_message_at: new Date().toISOString()
      }).eq('id', chatId);

      return mayaMsg as MayaMessage;
    }

    // 3. Intent & Mood Awareness
    const [metaAction, historyRes] = await Promise.all([
      detectMoodAndIntent(text),
      supabase
        .from('maya_messages')
        .select('*')
        .eq('chat_id', chatId)
        .eq('flagged', false) // Only fetch clean history for AI context
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    const { mood, intent } = metaAction;
    const historyData = historyRes.data || [];

    // 4. Save User Message
    await supabase.from('maya_messages').insert({
      chat_id: chatId,
      sender: 'user',
      message_text: text,
      mood_detected: mood,
      intent: intent
    });

    // 5. Prepare Context for AI (Last 10 messages)
    const history: MayaHistoryItem[] = historyData
      .reverse() // ordered by created_at ascending for AI
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.message_text
      }));

    // 6. Get Response from Gemini
    const responseText = await getMayaResponse(text, history);

    
    // 7. Save Maya's Response
    const { data: mayaMsg, error: mayaError } = await supabase.from('maya_messages').insert({
      chat_id: chatId,
      sender: 'maya',
      message_text: responseText,
      mood_detected: mood,
      intent: intent
    }).select().single();

    if (mayaError) throw mayaError;

    // 8. Update Chat Metadata
    const updates: Partial<MayaChat> = {
      message_count: chat.message_count + 1,
      last_message_at: new Date().toISOString()
    };

    if (chat.message_count === 0) {
      updates.title = await generateChatTitle(text);
    }

    await supabase.from('maya_chats').update(updates).eq('id', chatId);

    // 9. Update Usage Statistics
    const { data: usage } = await supabase
      .from('maya_usage')
      .select('id, messages_sent')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (usage) {
      await supabase.from('maya_usage').update({ messages_sent: usage.messages_sent + 1 }).eq('id', usage.id);
    } else {
      await supabase.from('maya_usage').insert({ user_id: userId, date: today, chats_created: 1, messages_sent: 1 });
    }

    return mayaMsg as MayaMessage;
  },

  /**
   * Lists all chat sessions for a user
   */
  async listChats(userId: string) {
    const { data, error } = await supabase
      .from('maya_chats')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data as MayaChat[];
  },

  /**
   * Fetches messages for a specific chat
   */
  async getMessages(chatId: string) {
    const { data, error } = await supabase
      .from('maya_messages')
      .select('*')
      .eq('id', chatId) // Fix: should be chat_id
      .order('created_at', { ascending: true });

    // Wait, the previous version had .eq('chat_id', chatId). Let's fix that too.
    const { data: correctData, error: correctError } = await supabase
      .from('maya_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (correctError) throw correctError;
    return correctData as MayaMessage[];
  },

  /**
   * Updates feedback for a chat session
   */
  async submitFeedback(chatId: string, feedback: 'up' | 'down') {
    const { error } = await supabase
      .from('maya_chats')
      .update({
        feedback,
        feedback_at: new Date().toISOString()
      })
      .eq('id', chatId);

    if (error) throw error;
  },

  /**
   * Checks if user can create a new journal entry today
   */
  async checkJournalQuota(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [plan, usageCount] = await Promise.all([
      this.getUserPlan(userId),
      supabase
        .from('user_journals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())
    ]);

    const limit = plan?.limits.journal.entries_per_day ?? 1;

    if (limit !== -1 && (usageCount.count ?? 0) >= limit) {
      return { allowed: false, planName: plan?.name };
    }
    return { allowed: true, planName: plan?.name };
  },

  /**
   * Checks if user can create a new task today
   */
  async checkTasksQuota(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [plan, usageCount] = await Promise.all([
      this.getUserPlan(userId),
      supabase
        .from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('parent_task_id', null) // Only main tasks
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())
    ]);

    const limit = plan?.limits.tasks.tasks_per_day ?? 5;

    if (limit !== -1 && (usageCount.count ?? 0) >= limit) {
      return { allowed: false, planName: plan?.name };
    }
    return { allowed: true, planName: plan?.name };
  },

  /**
   * Fetches all available plans
   */
  async getPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price_usd', { ascending: true });
    if (error) throw error;
    return data as Plan[];
  },

  /**
   * Fetches full subscription details for UI
   */
  async getSubscriptionDetails(userId: string) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return await this.validateSubscription(data);
  }
};
