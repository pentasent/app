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
    is_uploading?: boolean;
    local_image_urls?: string[];
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

export interface Article {
    id: string;
    author_id: string;
    title: string;
    slug: string;
    description: string;
    banner_image: string;
    status: 'draft' | 'published';
    reading_time: number;
    view_count: number;
    like_count: number;
    comment_count: number;
    created_at: string;
    updated_at: string;
    published_at: string | null;
    canonical_url?: string | null;

    // Joins
    author?: User;
    blocks?: ArticleBlock[];
    seo?: ArticleSEO;
    tags?: ArticleTag[];
    user_has_liked?: boolean;
}

export interface ArticleBlock {
    id: string;
    article_id: string;
    position: number;
    type: 'heading' | 'paragraph' | 'image' | 'bullet_list' | 'numbered_list' | 'quote' | 'highlight' | 'video' | 'divider';
    content: any; // jsonb
    created_at: string;
}

export interface ArticleSEO {
    id: string;
    article_id: string;
    meta_title?: string | null;
    meta_description?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    og_image?: string | null;
    twitter_title?: string | null;
    twitter_description?: string | null;
    twitter_image?: string | null;
    keywords?: string[] | null;
    structured_data?: any | null;
}

export interface ArticleLike {
    id: string;
    article_id: string;
    user_id: string;
    created_at: string;
}

export interface ArticleView {
    id: string;
    article_id: string;
    user_id?: string | null;
    ip_hash: string;
    viewed_at: string;
}

export interface ArticleComment {
    id: string;
    article_id: string;
    user_id: string;
    parent_id?: string | null;
    content: string;
    like_count: number;
    created_at: string;
    updated_at: string;

    // Joins
    user?: User;
    replies?: ArticleComment[];
    user_has_liked?: boolean;
    reply_count?: number;
}

export interface ArticleCommentLike {
    id: string;
    comment_id: string;
    user_id: string;
    created_at: string;
}

export interface ArticleTag {
    id: string;
    name: string;
    slug: string;
}

export interface ArticleTagMap {
    article_id: string;
    tag_id: string;
}

export interface UserDailyCheckin {
    id: string;
    user_id: string;
    mood_score: number; // 1-5
    energy_level: number; // 1-5
    stress_level: number; // 1-5
    sleep_quality: number; // 1-5
    mood_tag: string; // happy, calm, neutral, sad, anxious, tired
    notes?: string | null;
    suggested_action?: string | null;
    suggested_content_id?: string | null;
    checkin_date: string; // YYYY-MM-DD
    created_at: string;
}

export interface MayaChat {
    id: string;
    user_id: string;
    title?: string | null;
    message_count: number;
    status: 'active' | 'archived';
    last_message_at?: string | null;
    feedback?: 'up' | 'down' | null;
    feedback_at?: string | null;
    created_at: string;
}

export interface MayaMessage {
    id: string;
    chat_id: string;
    sender: 'user' | 'maya' | 'system';
    message_text: string;
    message_json?: any | null; // For rich responses or metadata
    tokens_used?: number | null;
    flagged: boolean;
    mood_detected?: string | null;
    intent?: string | null;
    created_at: string;
}

export interface MayaUsage {
    id: string;
    user_id: string;
    date: string; // YYYY-MM-DD
    chats_created: number;
    messages_sent: number;
    created_at: string;
}

export interface MayaSafetyLog {
    id: string;
    user_id: string;
    chat_id: string;
    message: string;
    category: 'abuse' | 'self_harm' | 'medical' | 'sexual' | 'violence' | 'illegal' | 'out_of_scope';
    created_at: string;
}

export interface PlanLimit {
    maya: {
        chats_per_day: number;
        messages_per_chat: number;
    };
    journal: {
        entries_per_day: number;
    };
    tasks: {
        tasks_per_day: number;
    };
    beats: {
        categories: number;
    };
    yoga: {
        premium_access: boolean;
    };
    sounds: {
        premium_access: boolean;
    };
    communities: {
        access: boolean;
    };
    habits: {
        tracking: boolean;
    };
}

export interface Plan {
    id: string;
    name: string;
    price_usd: number;
    description: string | null;
    limits: PlanLimit;
    created_at: string;
}

export interface UserSubscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: 'active' | 'canceled' | 'expired';
    start_date: string;
    end_date: string | null;
    is_complementary: boolean;
    offered_by?: string | null;
    created_at: string;
    updated_at: string;
    // Join
    plan?: Plan;
}

export interface Game {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    thumbnail_url?: string | null;
    is_active: boolean;
    is_paid: boolean;
    price: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface GameSession {
    id: string;
    user_id: string;
    game_id: string;
    score: number;
    duration_seconds: number;
    is_completed: boolean;
    metadata: any;
    started_at: string;
    ended_at?: string | null;
    created_at: string;
}

export interface GameUserStat {
    user_id: string;
    game_id: string;
    total_score: number;
    highest_score: number;
    total_sessions: number;
    total_play_time: number;
    streak_days: number;
    last_played_at: string | null;
    updated_at: string;
}

export interface YogaDayRegistration {
    id: number;
    user_id: string;
    registered_at: string;
    created_at: string;
}
