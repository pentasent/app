import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import crashlytics from '@/lib/crashlytics';
import { Notification } from '../types';
import { supabase, useAuth } from './AuthContext';

interface AppContextType {
  notifications: Notification[];
  unreadCount: number;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Partial<Notification>) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  toast: { message: string | null; type: 'success' | 'error' | 'info'; duration: number };
  hideToast: () => void;
  isConnected: boolean | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isRealtimeReady } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [toast, setToast] = useState<{ message: string | null; type: 'success' | 'error' | 'info'; duration: number }>({
    message: null,
    type: 'info',
    duration: 5000
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) => {
    setToast(prev => {
      if (prev.message === message && prev.type === type && prev.duration === duration) {
        return prev;
      }
      return { message, type, duration };
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, message: null }));
  }, []);

  // Unified Network Observer
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = !!state.isConnected && !!state.isInternetReachable;
      
      setIsConnected(prev => {
        if (prev !== isOnline) {
             if (!isOnline) {
                if (user && (user as any).is_onboarded) {
                    showToast("Connection lost. Reconnecting to mission control...", "error", 0);
                }
             } else {
                  setToast(current => {
                    if (current.message === "Connection lost. Reconnecting to mission control...") {
                        return { ...current, message: null };
                    }
                    return current;
                  });
             }
        }
        return isOnline;
      });
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user && (user as any).is_verified) {
      // console.log('[DEBUG-Notification] Initial fetch starting...');
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id, (user as any)?.is_verified]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user && (user as any).is_verified && isRealtimeReady) {
      // console.log('[DEBUG-Notification] Realtime ready. Starting subscription...');
      unsubscribe = subscribeToNotifications();
    }

    return () => {
      if (unsubscribe) {
        // console.log('[DEBUG-Notification] Cleaning up subscription');
        unsubscribe();
      }
    };
  }, [user?.id, (user as any)?.is_verified, isRealtimeReady]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setNotifications(data);
        const unread = data.filter((n) => !n.is_seen).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      // console.error('[Notifications] Fetch failed:', error);
      crashlytics().recordError(error as any);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channelName = `notifications_user_${user.id}`;
    
    // Check internal auth state
    const rtToken = (supabase.realtime as any).accessToken;
    // console.log(`[DEBUG-Notification] Creating channel: ${channelName}. RT Auth Token Present: ${!!rtToken}`);

    const channel = supabase
      .channel(`notifications_user_${user.id}`, {
        config: {
          broadcast: { self: true },
          presence: { key: user.id }
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as any;
          if (newNotif && newNotif.user_id === user.id) {
            fetchNotifications();
          }
        }
      )
      .subscribe((status, err) => {
        // console.log('[DEBUG-Notification] Status transition:', status);
        if (err) console.error('[DEBUG-Notification] ERROR:', err);
      });

    return () => {
      // console.log(`[DEBUG-Notification] Cleaning up channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_seen: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const { error } = await supabase
        .from('notifications')
        .update({ is_seen: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      // console.log('[ERROR]:', 'Error marking notification read', error);
      crashlytics().recordError(error as any);
      fetchNotifications();
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    try {
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_seen: true }))
      );
      setUnreadCount(0);

      const { error } = await supabase
        .from('notifications')
        .update({ is_seen: true })
        .eq('user_id', user.id)
        .eq('is_seen', false);

      if (error) throw error;
    } catch (error) {
      console.log('[ERROR]:', 'Error marking all notifications read', error);
      crashlytics().recordError(error as any);
      fetchNotifications();
    }
  };

  const addNotification = async (notification: Partial<Notification>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        is_seen: false,
        is_active: true,
        category: 'info',
        ...notification,
      });

      if (error) throw error;
      await fetchNotifications();
    } catch (e) {
      console.log('[ERROR]:', 'Error adding notification:', e);
      crashlytics().recordError(e as any);
    }
  };

  const contextValue = React.useMemo(() => ({
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    fetchNotifications,
    unreadCount,
    addNotification,
    showToast,
    toast,
    hideToast,
    isConnected,
  }), [
    notifications, markNotificationRead, markAllNotificationsRead,
    fetchNotifications, unreadCount, addNotification, showToast, toast, hideToast,
    isConnected
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
