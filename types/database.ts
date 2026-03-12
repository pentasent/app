export interface User {
    id: string;
    name: string;
    email: string;
    password?: string; // Usually not needed in frontend types but part of schema
    avatar_url?: string | null;
    country?: string | null;
    phone?: string | null;
    bio?: string | null;
    role: 'user' | 'admin';
    followers_count: number;
    following_count: number;
    profile_views_count: number;
    posts_count: number;
    is_verified: boolean;
    is_active: boolean;
    is_onboarded: boolean;
    created_at: string;
}

export interface Community {
    id: string;
    name: string;
    description?: string | null;
    logo_url?: string | null;
    banner_url?: string | null;
    country?: string | null;
    followers_count: number;
    visibility_type: 'public' | 'private'; // implied text enum
    access_type: 'free' | 'paid'; // implied text enum
    is_active: boolean;
    created_at: string;
    is_default?: boolean;
    created_by?: string;
}

export interface CommunityModerator {
    id: string;
    community_id: string;
    user_id: string;
    created_at: string;
}

export interface CommunityFollower {
    id: string;
    community_id: string;
    user_id: string;
    created_at: string;
}

export interface Channel {
    id: string;
    community_id: string;
    name: string;
    description?: string | null;
    logo_url?: string | null;
    is_private: boolean;
    is_default: boolean;
    is_active: boolean;
    followers_count: number;
    created_at: string;
}

export interface ChannelFollower {
    id: string;
    channel_id: string;
    user_id: string;
    created_at: string;
}

export interface Post {
    id: string;
    user_id: string;
    community_id: string;
    title?: string | null;
    content: any; // jsonb
    country?: string | null;
    likes_count: number;
    comments_count: number;
    views_count: number;
    is_active: boolean;
    is_edited: boolean;
    created_at: string;
    updated_at?: string;

    // Joins/Virtual
    user?: User;
    community?: Community;
    images?: PostImage[];
    channels?: Channel[]; // via post_channels
    user_has_liked?: boolean;
}

export interface PostImage {
    id: string;
    post_id: string;
    image_url: string;
    order_index: number;
}

export interface PostChannel {
    post_id: string;
    channel_id: string;
}

export interface Like {
    id: string;
    post_id: string;
    user_id: string;
    created_at: string;
}

export interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    parent_comment_id?: string | null;
    content: any; // jsonb
    likes_count: number;
    is_active: boolean;
    is_edited: boolean;
    created_at: string;
    updated_at?: string;

    // Joins
    user?: User;
    replies?: Comment[];
    user_has_liked?: boolean;
}

export interface CommentLike {
    id: string;
    comment_id: string;
    user_id: string;
    created_at: string;
}

export interface CreatePostDTO {
    community_id: string;
    channel_ids?: string[];
    title?: string;
    content: any;
    images?: string[];
    country?: string;
}

export interface CommunityChat {
    id: string;
    community_id: string;
    is_active: boolean;
    created_at: string;
    // Joins
    community?: Community;
}

export interface CommunityChatMember {
    id: string;
    chat_id: string;
    user_id: string;
    joined_at: string;
    last_read_at?: string | null;
    is_active: boolean;
    // Joins
    user?: User;
}

export interface CommunityChatMessage {
    id: string;
    chat_id: string;
    user_id: string;
    message_text: string;
    parent_message_id?: string | null;
    parent_message_text?: string | null;
    is_edited: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    // Joins
    user?: User;
    parent_message?: CommunityChatMessage & { user?: User };
}

export interface CommunityChatReadStatus {
    id: string;
    chat_id: string;
    user_id: string;
    last_read_at: string;
    updated_at: string;
}

export interface UserJournal {
    id: string;
    user_id: string;
    title?: string | null;
    content: string;
    tags?: string[] | null;
    mood_label?: string | null;
    mood_emoji?: string | null;
    mood_intensity?: number | null;
    energy_level?: number | null;
    is_favorite: boolean;
    is_private: boolean;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface UserTask {
    id: string;
    user_id: string;
    parent_task_id?: string | null;
    title: string;
    description?: string | null;
    is_completed: boolean;
    completed_at?: string | null;
    priority: 'low' | 'medium' | 'high';
    tags?: string[] | null;
    due_date?: string | null;
    reminder_at?: string | null;
    sort_order: number;
    estimated_minutes?: number | null;
    actual_minutes?: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface YogaContent {
    id: string;
    title: string;
    slug: string;
    type: 'asana' | 'pranayama';
    short_description?: string | null;
    content: any; // jsonb
    banner_image_url?: string | null;
    audio_url?: string | null;
    duration_minutes: number;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    calories_burn_estimate?: number | null;
    is_active: boolean;
    views_count: number;
    likes_count: number;
    created_at: string;
    updated_at: string;
}

export interface YogaImage {
    id: string;
    yoga_id: string;
    image_url: string;
    order_index: number;
    caption?: string | null;
    created_at: string;
}

export interface YogaSuggestedVideo {
    id: string;
    yoga_id: string;
    video_title: string;
    video_url: string;
    platform: 'youtube' | 'vimeo' | 'other';
    created_at: string;
}

export interface YogaTag {
    id: string;
    name: string;
    created_at: string;
}

export interface YogaContentTag {
    yoga_id: string;
    tag_id: string;
}

export interface ProductCategory {
    id: string;
    name: string;
    slug: string;
    created_at: string;
}

export interface Product {
    id: string;
    title: string;
    slug: string;
    image_url: string;
    product_url: string;
    short_description?: string | null;
    category_id: string;
    views_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;

    // Joins
    product_categories?: ProductCategory;
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

export interface Meditation {
    id: string;
    title: string;
    description?: string | null;
    audio_url: string;
    banner_url?: string | null;
    play_count: number;
    created_at: string;
}
