
const STORAGE_BASE_URL = process.env.EXPO_PUBLIC_STORAGE_BASE_URL || "https://api.pentasent.com/storage/v1/object/public";
const BUCKET = process.env.EXPO_PUBLIC_BUCKET || "avatars";

/**
 * Constructs a full URL for any media stored in the avatars bucket.
 * Handles profiles, posts, yoga, meditation, beats, and articles.
 * 
 * @param path Relative path (e.g. 'avatars/abc.jpg') or full HTTP URL
 * @returns Full URL string or placeholder if path is missing
 */
export function getImageUrl(path: string | null | undefined) {
    if (!path) {
        return `${STORAGE_BASE_URL}/${BUCKET}/placeholders/icon.png`;
    }
    
    // If it's already a full URL or a local URI, return it as is
    if (path.startsWith('http') || path.startsWith('file') || path.startsWith('content')) {
        return path;
    }
    
    // Prepend base URL and bucket
    return `${STORAGE_BASE_URL}/${BUCKET}/${path}`;
}