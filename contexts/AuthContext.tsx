import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';
import { uploadImage } from '../utils/image-upload';

export { supabase };

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, metadata?: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: {
    name?: string;
    bio?: string;
    country?: string;
    avatar_uri?: string;
    is_onboarded?: boolean;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Load
    // const initializeAuth = async () => {
    //   try {
    //     const { data: { user }, error } = await supabase.auth.getUser();

    //     if (error || !user) {
    //       await supabase.auth.signOut().catch(console.error);
    //       setLoading(false);
    //       return;
    //     }

    //     await fetchAndSetUserData(user.id, user.email || '');
    //   } catch (e) {
    //     console.error("Initial session fetch error:", e);
    //     await supabase.auth.signOut().catch(console.error);
    //     setLoading(false);
    //   }
    // };
const initializeAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      await supabase.auth.signOut().catch(console.error);
      setLoading(false);
      return;
    }

    // IMPORTANT
    supabase.realtime.setAuth(session.access_token);

    await fetchAndSetUserData(session.user.id, session.user.email || '');
  } catch (e) {
    console.error("Initial session fetch error:", e);
    await supabase.auth.signOut().catch(console.error);
    setLoading(false);
  }
};
    initializeAuth();

    // 2. Listen for Auth State Changes (Login, Logout, Token Refresh)
    // const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    //   if (event === 'SIGNED_IN' && session?.user) {
    //     await fetchAndSetUserData(session.user.id, session.user.email || '');
    //   } else if (event === 'SIGNED_OUT') {
    //     setUser(null);
    //     setIsAdmin(false);
    //     setLoading(false);
    //   }
    // });
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {

    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token);
    }

    if (event === 'SIGNED_IN' && session?.user) {
      await fetchAndSetUserData(session.user.id, session.user.email || '');
    }

    if (event === 'SIGNED_OUT') {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }
);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAndSetUserData = async (userId: string, email: string) => {
    try {
      const { data: publicUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (publicUser) {
        const userData: User = {
          id: publicUser.id,
          email: publicUser.email,
          name: publicUser.name,
          avatar_url: publicUser.avatar_url,
          country: publicUser.country,
          phone: publicUser.phone,
          bio: publicUser.bio,
          role: publicUser.role || 'user',
          followers_count: publicUser.followers_count || 0,
          following_count: publicUser.following_count || 0,
          profile_views_count: publicUser.profile_views_count || 0,
          posts_count: publicUser.posts_count || 0,
          is_verified: publicUser.is_verified || false,
          is_active: publicUser.is_active !== false,
          is_onboarded: publicUser.is_onboarded || false,
          created_at: publicUser.created_at,
        };
        setUser(userData);
        setIsAdmin(userData.role === 'admin' || email === 'hello@pentasent.com');
      } else {
        // User authenticated in auth.users but not yet migrated/synced to public.users
        // A trigger should handle this, but as a fallback/draft state:
        const draftUser: User = {
          id: userId,
          email: email,
          name: email.split('@')[0],
          role: 'user',
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          posts_count: 0,
          is_verified: false,
          is_active: true,
          is_onboarded: false,
          created_at: new Date().toISOString()
        };
        setUser(draftUser);
        setIsAdmin(email === 'hello@pentasent.com');
      }
    } catch (e) {
      console.error("Error fetching public user data:", e);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("Account already exists. Please login instead.");
      }

      // If email confirmation is off, the user is signed in immediately 
      // and onAuthStateChange will catch it.

    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      // onAuthStateChange handles the rest

    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    if (user) {
      await fetchAndSetUserData(user.id, user.email || '');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://pentasent.com/reset-password',
      });
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Reset password failed');
    }
  };

  const updateProfile = async (updates: {
    name?: string;
    bio?: string;
    country?: string;
    avatar_uri?: string;
    is_onboarded?: boolean;
  }) => {
    if (!user) return;

    // 1. Optimistic UI update
    const optimisticUser = {
      ...user,
      ...updates,
      avatar_url: updates.avatar_uri || user.avatar_url, // Use local URI as preview
    };
    setUser(optimisticUser);

    // 2. Background Process
    (async () => {
      try {
        let finalAvatarUrl = user.avatar_url;

        // If it's a new local image, upload it
        if (
          updates.avatar_uri &&
          (updates.avatar_uri.startsWith('file') ||
            updates.avatar_uri.startsWith('content'))
        ) {
          const filename = `avatars/${user.id}_${Date.now()}.jpg`;
          const uploadResult = await uploadImage(updates.avatar_uri, filename);
          if (uploadResult) {
            finalAvatarUrl = filename;
          }
        }

        const { error } = await supabase
          .from('users')
          .update({
            name: updates.name !== undefined ? updates.name : user.name,
            bio: updates.bio !== undefined ? updates.bio : user.bio,
            country:
              updates.country !== undefined ? updates.country : user.country,
            avatar_url: finalAvatarUrl,
            is_onboarded:
              updates.is_onboarded !== undefined
                ? updates.is_onboarded
                : user.is_onboarded,
          })
          .eq('id', user.id);

        if (error) throw error;

        // Refresh to get final server state
        await refreshUser();
      } catch (error) {
        console.error('Background Profile Update Failed:', error);
        // On failure, revert optimistic update
        await refreshUser();
      }
    })();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        login,
        register,
        logout,
        refreshUser,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
