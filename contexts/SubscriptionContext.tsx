import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, useAuth } from './AuthContext';
import { MayaService } from '@/lib/maya/service';
import { Plan, UserSubscription, PlanLimit } from '@/types/database';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  plan: Plan | null;
  limits: PlanLimit | null;
  loading: boolean;
  isExpired: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Default limits for users without a plan (Fallback)
const DEFAULT_LIMITS: PlanLimit = {
  maya: { chats_per_day: 1, messages_per_chat: 10 },
  journal: { entries_per_day: 1 },
  tasks: { tasks_per_day: 5 },
  beats: { categories: 1 },
  yoga: { premium_access: false },
  sounds: { premium_access: false },
  communities: { access: true },
  habits: { tracking: false }
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const subDetails = await MayaService.getSubscriptionDetails(user.id);
      setSubscription(subDetails);
    } catch (error) {
      console.error('Error fetching subscription details:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();

    if (!user) return;

    // Real-time listener for subscription updates (from Web/Stripe)
    const subChannel = supabase
      .channel(`user-subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // console.log('[SubscriptionContext] Change detected, refreshing...');
          refreshSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
    };
  }, [user, refreshSubscription]);

  const plan = subscription?.plan || null;
  const limits = plan?.limits || DEFAULT_LIMITS;

  // Improved isExpired check (Status-based + Date-based)
  const isExpired = React.useMemo(() => {
    if (!subscription) return false;
    if (subscription.status === 'expired') return true;
    
    // If active, double check the date
    if (subscription.status === 'active' && subscription.end_date) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const end = new Date(subscription.end_date);
      const expirationDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return today > expirationDate;
    }
    
    return false;
  }, [subscription]);

  const contextValue = React.useMemo(() => ({
    subscription,
    plan,
    limits,
    loading,
    isExpired,
    refreshSubscription
  }), [subscription, plan, limits, loading, isExpired, refreshSubscription]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
