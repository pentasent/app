export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  avatar_url?: string;
  country?: string;
  headline?: string;
}

export interface Chat {
  id: string;
  title: string;
  description: string;
  image: string;
  date: string;
  messages: Message[];
  diseaseId?: string;
  routineCreated: boolean;
}

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  image?: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  diseaseId: string;
  startDate: string;
  tasks: RoutineTask[];
  chatId: string;
}

export interface RoutineTask {
  id: string;
  title: string;
  completed: boolean;
  day: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type: 'post_like' | 'post_comment' | 'comment_reply' | 'chat_message' | 'community_follow' | 'account_warning' | 'system_announcement' | 'subscription_alert' | string;
  category: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  triggered_by_user_id?: string;
  post_id?: string;
  comment_id?: string;
  chat_id?: string;
  community_id?: string;
  redirect_url?: string;
  metadata?: any;
  is_seen: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BeatTag {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  music_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Beat {
  id: string;
  title: string;
  short_description?: string;
  tag_id: string;
  audio_url: string;
  banner_url?: string;
  duration_seconds?: number;
  play_count: number;
  like_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  beat_tags?: BeatTag; // For joined queries
}

export interface UserNotificationSetting {
  id: string;
  user_id: string;
  category: 'community' | 'post' | 'task' | 'journal' | 'tagging' | string;
  action: 'join' | 'leave' | 'create' | 'update' | 'delete' | 'complete' | 'all' | string;
  system_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  is_default: boolean;
  is_editable: boolean;
  created_at: string;
}
