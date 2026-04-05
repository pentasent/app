import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import crashlytics from '@/lib/crashlytics';
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
  unverifiedEmail: string | null;
  setUnverifiedEmail: (email: string | null) => void;
  otpType: 'signup' | 'recovery';
  setOtpType: (type: 'signup' | 'recovery') => void;
  isResetVerified: boolean;
  setIsResetVerified: (verified: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [otpType, setOtpType] = useState<'signup' | 'recovery'>('signup');
  const [isResetVerified, setIsResetVerified] = useState(false);

  useEffect(() => {
    // 1. Initial Load
    // const initializeAuth = async () => {
    //   try {
    //     const { data: { user }, error } = await supabase.auth.getUser();

    //     if (error || !user) {
    //       await supabase.auth.signOut().catch(e => console.log('[ERROR]:', e);
    //       setLoading(false);
    //       return;
    //     }

    //     await fetchAndSetUserData(user.id, user.email || '');
    //   } catch (e) {
    //     console.log('[ERROR]:', "Initial session fetch error:", e);
    //     await supabase.auth.signOut().catch(e => console.log('[ERROR]:', e);
    //     setLoading(false);
    //   }
    // };
const initializeAuth = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      // If refresh token is missing or invalid, it means session is truly dead
      if (error.message.includes('Refresh Token Not Found') || error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
        await supabase.auth.signOut().catch(e => console.log('[ERROR]:', e));
        Alert.alert("Session Expired", "Your session has expired. Please log in again.");
      } else {
        console.warn("Session retrieval error:", error.message);
      }
      setLoading(false);
      return;
    }

    if (!session?.user) {
      await supabase.auth.signOut().catch(e => console.log('[ERROR]:', e));
      setLoading(false);
      return;
    }

    // IMPORTANT
    supabase.realtime.setAuth(session.access_token);

    await fetchAndSetUserData(session.user.id, session.user.email || '');
  } catch (e) {
    console.log('[ERROR]:', "Initial session fetch error:", e);
    crashlytics().recordError(e as any);
    await supabase.auth.signOut().catch(e => console.log('[ERROR]:', e));
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

      if (error && error.code !== 'PGRST116') throw error;

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
        // Explicitly create the user in public.users if they are verified in auth.users
        const defaultName = email.split('@')[0];
        const { data: maybeInserted, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: userId,
              email: email,
              name: defaultName,
              is_verified: false, // Set false initially so _layout redirects to setup-profile
              is_onboarded: false,
              role: 'user',
              followers_count: 0,
              following_count: 0,
              profile_views_count: 0,
              posts_count: 0,
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.log('[ERROR]:', "Failed to insert into public.users:", insertError);
          // Fallback to draft user if insert fails
          const draftUser: User = {
            id: userId,
            email: email,
            name: defaultName,
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
        } else if (maybeInserted) {
          setUser(maybeInserted as User);
        }
        setIsAdmin(email === 'hello@pentasent.com');
      }
    } catch (e) {
      console.log('[ERROR]:', "Error fetching public user data:", e);
      crashlytics().recordError(e as any);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, metadata?: any) => {
    try {
      // Pre-flight check: Is the user in public.users?
      const { data: existingPublicUser } = await supabase
        .from('users')
        .select('id, is_verified')
        .ilike('email', email)
        .maybeSingle();

      if (existingPublicUser) {
        throw new Error("Account already exists. Please login instead.");
      }

      // Pre-flight check: Is the user in auth.users but NOT in public.users?
      // Delete-and-Recreate strategy to ensure latest password and trigger OTP.
      await supabase.rpc('delete_unconfirmed_user', { target_email: email });

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
      
      // We expect confirmation to be ON, so auth state won't change yet.
      // We set unverified email so the Verify OTP component can pick it up.
      setUnverifiedEmail(email);
      setOtpType('signup');

    } catch (error: any) {
      crashlytics().recordError(error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Pre-check existence in public.users
      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

      if (!publicUser) {
        throw new Error("Account not found. Please sign up.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Auto-resend OTP if email is not confirmed
        if (error.message.includes('Email not confirmed')) {
           const { error: resendError } = await supabase.auth.resend({
             type: 'signup',
             email: email,
           });
           const modifiedError = new Error(error.message) as any;
           if (resendError) {
             modifiedError.resendFailed = true;
             modifiedError.resendMessage = resendError.message;
           }
           throw modifiedError;
        }
        throw error;
      }

      // onAuthStateChange handles the rest

    } catch (error: any) {
      crashlytics().recordError(error);
      throw error; // Re-throw the original error to be caught by the component
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      crashlytics().recordError(error as any);
      throw error;
    }
  };

  // const refreshUser = async () => {
  //   if (user) {
  //     await fetchAndSetUserData(user.id, user.email || '');
  //   }
  // };

  const refreshUser = async () => {
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) {
    await fetchAndSetUserData(authUser.id, authUser.email || '');
  }
};

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://pentasent.com/reset-password',
      });
      if (error) throw error;
    } catch (error: any) {
      crashlytics().recordError(error);
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
        console.log('[ERROR]:', 'Background Profile Update Failed:', error);
        crashlytics().recordError(error as any);
        // On failure, revert optimistic update
        await refreshUser();
      }
    })();
  };

  const contextValue = React.useMemo(() => ({
    user,
    isAdmin,
    loading,
    login,
    register,
    logout,
    refreshUser,
    resetPassword,
    updateProfile,
    unverifiedEmail,
    setUnverifiedEmail,
    otpType,
    setOtpType,
    isResetVerified,
    setIsResetVerified,
  }), [
    user,
    isAdmin,
    loading,
    unverifiedEmail,
    otpType,
    isResetVerified,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
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
