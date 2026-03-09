import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chat, Routine, CartItem, Notification, Message, RoutineTask } from '../types';
import { diseases } from '../constants/dummyData';
import { supabase, useAuth } from './AuthContext';

interface AppContextType {
  chats: Chat[];
  routines: Routine[];
  cart: CartItem[];
  notifications: Notification[];
  unreadCount: number;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  addMessageToChat: (chatId: string, message: Message) => void;
  deleteChat: (chatId: string) => void;
  createRoutineFromChat: (chatId: string) => void;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  updateRoutineTask: (routineId: string, taskId: string, completed: boolean) => void;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Partial<Notification>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData();
  }, [chats, routines, cart]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user && user.is_verified) {
      fetchNotifications();
      unsubscribe = subscribeToNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

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
      console.error('Error fetching notifications:', error);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channelName = `notifications_user_${user.id}`;

    console.log(`Setting up notification subscription for user: ${user.id}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // Verify if this notification belongs to the current user
          const newNotif = payload.new as any;
          if (newNotif && newNotif.user_id === user.id) {
            console.log('Real-time notification received for user:', user.id);
            fetchNotifications();
          }
        }
      )
      .subscribe((status) => {
        console.log(`Notification subscription status [${user.id}]:`, status);
        if (status === 'SUBSCRIBED') {
          // Force a fetch once subscribed to ensure we are in sync
          fetchNotifications();
        }
      });

    return () => {
      console.log(`Cleaning up notification subscription for user: ${user.id}`);
      supabase.removeChannel(channel);
    };
  };

  const loadData = async () => {
    try {
      const [chatsData, routinesData, cartData, notificationsData] = await Promise.all([
        AsyncStorage.getItem('chats'),
        AsyncStorage.getItem('routines'),
        AsyncStorage.getItem('cart'),
        AsyncStorage.getItem('notifications'),
      ]);

      if (chatsData) setChats(JSON.parse(chatsData));
      if (routinesData) setRoutines(JSON.parse(routinesData));
      if (cartData) setCart(JSON.parse(cartData));

      if (notificationsData) {
        // setNotifications(JSON.parse(notificationsData)); 
        // We now fetch from supabase, so ignore local storage for notifications
      } else {
        // const initialNotifications: Notification[] = ...
        // Ignore dummy data
      }

      // }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('chats', JSON.stringify(chats)),
        AsyncStorage.setItem('routines', JSON.stringify(routines)),
        AsyncStorage.setItem('cart', JSON.stringify(cart)),
        AsyncStorage.setItem('chats', JSON.stringify(chats)),
        AsyncStorage.setItem('routines', JSON.stringify(routines)),
        AsyncStorage.setItem('cart', JSON.stringify(cart)),
        // AsyncStorage.setItem('notifications', JSON.stringify(notifications)), // Sync with Supabase instead
      ]);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const addChat = (chat: Chat) => {
    setChats((prev) => [chat, ...prev]);
  };

  const updateChat = (chatId: string, updates: Partial<Chat>) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, ...updates } : chat))
    );
  };

  const addMessageToChat = (chatId: string, message: Message) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, message] }
          : chat
      )
    );
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));

    const routinesToDelete = routines.filter((r) => r.chatId === chatId);
    if (routinesToDelete.length > 0) {
      setRoutines((prev) => prev.filter((r) => r.chatId !== chatId));
    }

    addNotification({
      title: 'Chat Deleted',
      message: 'Your consultation has been deleted successfully.',
      notification_type: 'account',
      category: 'info'
    });
  };

  const createRoutineFromChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat || !chat.diseaseId) return;

    const disease = diseases.find((d) => d.id === chat.diseaseId);
    if (!disease) return;

    const totalDays = 7;
    const totalTasks = disease.routineTasks.length;
    const tasksPerDay = Math.ceil(totalTasks / totalDays);

    const tasks: RoutineTask[] = disease.routineTasks.map((task, index) => ({
      id: `task-${Date.now()}-${index}`,
      title: task,
      completed: false,
      day: Math.min(Math.floor(index / tasksPerDay) + 1, totalDays),
    }));

    const routine: Routine = {
      id: `routine-${Date.now()}`,
      name: disease.name,
      description: disease.description,
      diseaseId: disease.id,
      startDate: new Date().toISOString(),
      tasks,
      chatId,
    };

    setRoutines((prev) => [routine, ...prev]);
    updateChat(chatId, { routineCreated: true });

    addNotification({
      title: 'Routine Created',
      message: `Your ${disease.name} skincare routine has been created successfully!`,
      notification_type: 'routine',
      category: 'success'
    });
  };

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const updateRoutineTask = (routineId: string, taskId: string, completed: boolean) => {
    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id === routineId
          ? {
            ...routine,
            tasks: routine.tasks.map((task) =>
              task.id === taskId ? { ...task, completed } : task
            ),
          }
          : routine
      )
    );
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      // Optimistic update
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
      console.error('Error marking notification read', error);
      fetchNotifications(); // Revert on error
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    try {
      // Optimistic update
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
      console.error('Error marking all notifications read', error);
      fetchNotifications(); // Revert on error
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
      // Force immediate refresh for the current user
      await fetchNotifications();
    } catch (e) {
      console.error('Error adding notification:', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        chats,
        routines,
        cart,
        notifications,
        addChat,
        updateChat,
        addMessageToChat,
        deleteChat,
        createRoutineFromChat,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        updateRoutineTask,
        markNotificationRead,
        markAllNotificationsRead,
        fetchNotifications,
        unreadCount,
        addNotification,

      }}
    >
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
