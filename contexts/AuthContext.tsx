import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { User } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Load
    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        await fetchAndSetUserData(user.id, user.email || '');
      } catch (e) {
        console.error("Initial session fetch error:", e);
        await supabase.auth.signOut();
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Listen for Auth State Changes (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchAndSetUserData(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

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

  const register = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
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

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, register, logout, refreshUser }}>
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
