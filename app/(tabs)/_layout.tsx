import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import SVG icons
const homeIcon = require('../../assets/images/icons/feed.svg');
const homeFillIcon = require('../../assets/images/icons/feed_fill.svg');
const musicIcon = require('../../assets/images/icons/beats.svg');
const musicFillIcon = require('../../assets/images/icons/beats_fill.svg');
const exploreIcon = require('../../assets/images/icons/explore.svg');
const exploreFillIcon = require('../../assets/images/icons/explore_fill.svg');
const chatIcon = require('../../assets/images/icons/chat.svg');
const chatFillIcon = require('../../assets/images/icons/chat_fill.svg');
const updatesIcon = require('../../assets/images/icons/updates.svg');
const updatesFillIcon = require('../../assets/images/icons/updates_fill.svg');

export default function TabLayout() {
  const { user } = useAuth(); // Get user
  const { unreadCount } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.background,
            // backgroundColor: colors.surface,
            // borderTopColor: colors.border,
            // borderTopWidth: 1,
            paddingTop: 6,
            paddingBottom: 8 + Math.max(0, insets.bottom - 10), // Adjust padding for safe area
            height: 60 + Math.max(0, insets.bottom - 10), // Adjust height for safe area
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ focused, size }) => (
              <Image
                source={focused ? homeFillIcon : homeIcon}
                style={{ width: 27, height: 27 }}
                contentFit="contain"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="beats"
          options={{
            title: 'Beats',
            tabBarIcon: ({ focused, size }) => (
              <Image
                source={focused ? musicFillIcon : musicIcon}
                style={{ width: 27, height: 27 }}
                contentFit="contain"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ focused, size }) => (
              <Image
                source={focused ? exploreFillIcon : exploreIcon}
                style={{ width: 27, height: 27 }}
                contentFit="contain"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chats',
            tabBarIcon: ({ focused, size }) => (
              <Image
                source={focused ? chatFillIcon : chatIcon}
                style={{ width: 27, height: 27 }}
                contentFit="contain"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="updates"
          options={{
            title: 'Updates',
            tabBarIcon: ({ focused, size }) => (
              <Image
                source={focused ? updatesFillIcon : updatesIcon}
                style={{ width: 27, height: 27 }}
                contentFit="contain"
              />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.surface },
          }}
        />
      </Tabs>

    </>
  );
}


