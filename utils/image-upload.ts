import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Compresses an image to a maximum dimension and quality.
 */
export const compressImage = async (uri: string, maxWidth = 1200, quality = 0.8) => {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: maxWidth } }],
            { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (error) {
        console.error('Error compressing image:', error);
        return uri; // Return original if compression fails
    }
};

/**
 * Uploads an image to Supabase storage as fast as possible.
 * Uses ArrayBuffer which is very stable on React Native.
 */
export const uploadImage = async (uri: string, filename: string) => {
    try {
        // 1. Compress first (this makes the file smaller for faster network transmission)
        const compressedUri = await compressImage(uri);

        // 2. Read as base64 and convert to ArrayBuffer (Stable on Mobile)
        const base64 = await FileSystem.readAsStringAsync(compressedUri, { 
            encoding: 'base64' 
        });
        const arrayBuffer = decode(base64);

        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filename, arrayBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Fast upload failed:', error);
        throw error;
    }
};
