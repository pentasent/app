import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
export { supabase }; // Add this back!
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import crashlytics from '@/lib/crashlytics';

interface AuthContextType {
  session: Session | null;
  user: any; // Using any for now to allow public.users table fields like is_onboarded
  role: string | null;
  isAdmin: boolean;
  loading: boolean;
  isResetVerified: boolean;
  setIsResetVerified: (val: boolean) => void;
  setUser: (user: any) => void;
  setRole: (role: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setLoading: (loading: boolean) => void;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: { name?: string; bio?: string; country?: string; avatar_uri?: string; is_onboarded?: boolean }) => Promise<void>;
  register: (email: string, password: string, metadata?: any) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isRealtimeReady: boolean;
  unverifiedEmail: string | null;
  setUnverifiedEmail: (email: string | null) => void;
  otpType: 'signup' | 'recovery';
  setOtpType: (type: 'signup' | 'recovery') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRealtimeReady, setIsRealtimeReady] = useState(false);
  const [isResetVerified, setIsResetVerified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [otpType, setOtpType] = useState<'signup' | 'recovery'>('signup');

  useEffect(() => {
    // 1. Initial Session Check
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Handle session expiration or invalid tokens silently
          if (error.message.includes('Refresh Token Not Found') || 
              error.message.includes('refresh_token_not_found') || 
              error.message.includes('Invalid Refresh Token')) {
            // console.log('[AuthContext] Session expired or invalid, signing out');
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
          throw error;
        }

        setSession(initialSession);
        if (initialSession?.user) {
          await fetchAndSetUserData(initialSession.user.id, initialSession.user.email || '');
          // Important: Sync Realtime auth on startup
          supabase.realtime.setAuth(initialSession.access_token);
          setIsRealtimeReady(true);
        }
      } catch (err) {
        // console.warn('[AuthContext] Auth init failed:', err);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();

    // 2. FAILSAFE: Ensure loading is never stuck
    const failsafeTimer = setTimeout(() => {
      setLoading(prevState => {
        if (prevState) {
          console.log('[DEBUG]: AuthContext failsafe triggered');
          return false;
        }
        return prevState;
      });
    }, 6000);

    // 3. Listen for Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.access_token) {
          const tokenPreview = `${session.access_token.substring(0, 10)}...${session.access_token.substring(session.access_token.length - 10)}`;
          // console.log('[DEBUG-Realtime] Syncing auth token. Preview:', tokenPreview);
          
          try {
            supabase.realtime.setAuth(session.access_token);
            setIsRealtimeReady(true);
            // console.log('[DEBUG-Realtime] setAuth call completed successfully');
          } catch (err) {
            console.error('[DEBUG-Realtime] setAuth FAILED:', err);
          }
        } else {
          setIsRealtimeReady(false);
          // console.log('[DEBUG-Realtime] No session token available for sync');
        }

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchAndSetUserData(session.user.id, session.user.email || '');
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setRole(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(failsafeTimer);
    };
  }, []);

  const fetchAndSetUserData = async (userId: string, email: string, silent = false) => {
    try {
      const { data: publicUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (publicUser) {
        const userData = {
          ...publicUser,
          is_verified: publicUser.is_verified || false,
          is_onboarded: publicUser.is_onboarded || false,
          followers_count: publicUser.followers_count || 0,
          following_count: publicUser.following_count || 0,
          role: publicUser.role || 'user',
        };
        setUser(userData as any);
        setRole(userData.role);
        setIsAdmin(userData.role === 'admin' || userData.role === 'super_admin');
      } else {
        // Create user if they don't exist in the public users table
        const defaultName = email.split('@')[0] || 'User';
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            name: defaultName,
            is_verified: false,
            is_onboarded: false,
            role: 'user',
            followers_count: 0,
            following_count: 0,
            bio: '',
            avatar_url: null,
            created_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (createError) {
          console.error('[AuthContext] Create user failed:', createError);
          setUser({ id: userId, email, is_verified: false, is_onboarded: false, role: 'user' } as any);
          setRole('user');
          setIsAdmin(false);
        } else if (newUser) {
          setUser(newUser as any);
          setRole(newUser.role);
          setIsAdmin(newUser.role === 'admin' || newUser.role === 'super_admin');
        }
      }
    } catch (err) {
      console.error('[Notifications] fetchUserData error:', err);
      crashlytics().recordError(err as any);
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      await fetchAndSetUserData(user.id, user.email || '', true);
    }
  };

  const updateProfile = async (updates: { name?: string; bio?: string; country?: string; avatar_uri?: string; is_onboarded?: boolean }) => {
    if (!user?.id) throw new Error('Not authenticated');

    // Optimistic UI update
    const previousUser = { ...user };
    setUser({ ...user, ...updates } as any);

    try {
      let avatar_url = (user as any).avatar_url;

      if (updates.avatar_uri && (updates.avatar_uri.startsWith('file') || updates.avatar_uri.startsWith('content'))) {
        const fileExt = updates.avatar_uri.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const formData = new FormData();
        formData.append('file', {
          uri: updates.avatar_uri,
          name: fileName,
          type: `image/${fileExt}`,
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData);

        if (uploadError) throw uploadError;
        avatar_url = filePath;
      }

      const { error } = await supabase
        .from('users')
        .update({
          name: updates.name !== undefined ? updates.name : (user as any).name,
          bio: updates.bio !== undefined ? updates.bio : (user as any).bio,
          country: updates.country !== undefined ? updates.country : (user as any).country,
          avatar_url,
          is_onboarded: updates.is_onboarded !== undefined ? updates.is_onboarded : (user as any).is_onboarded,
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshUser();
    } catch (err) {
      console.error('[AuthContext] updateProfile error:', err);
      setUser(previousUser);
      throw err;
    }
  };

  const register = async (email: string, password: string, metadata?: any) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // 1. Check if user already exists and is verified in our public table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, is_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUser && existingUser.is_verified) {
        throw new Error('Account already exists. Please login instead.');
      }

      // 2. Failsafe: Cleanup unconfirmed Auth user if they exist but are not in public.users
      await supabase.rpc('delete_unconfirmed_user', { target_email: normalizedEmail });

      // 3. Proceed with Supabase Auth SignUp
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("Account already exists. Please login instead.");
      }

      setUnverifiedEmail(normalizedEmail);
      setOtpType('signup');

    } catch (err) {
      // console.log('[AuthContext] register error:', err);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // 1. First check if the user exists in our public users table
      const { data: publicUserCheck } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!publicUserCheck) {
        throw new Error('User not found. Please register first.');
      }

      // 2. Proceed with Supabase Auth Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          await supabase.auth.resend({
            type: 'signup',
            email: normalizedEmail,
          });
          setUnverifiedEmail(normalizedEmail);
          setOtpType('signup');
        }
        throw error;
      }

      if (data?.user) {
        await fetchAndSetUserData(data.user.id, data.user.email || '');
      }
    } catch (err) {
      // console.log('[AuthContext] login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      // console.log('[AuthContext] logout error:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        isAdmin,
        loading,
        setUser,
        setRole,
        setIsAdmin,
        setLoading,
        refreshUser,
        updateProfile,
        register,
        login,
        logout,
        isRealtimeReady,
        unverifiedEmail,
        setUnverifiedEmail,
        otpType,
        setOtpType,
        isResetVerified,
        setIsResetVerified
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
