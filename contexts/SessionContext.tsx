import React, { createContext, useContext, useState, useCallback } from 'react';

interface SessionContextType {
  isFeedAlreadyLoaded: boolean;
  setFeedAlreadyLoaded: (value: boolean) => void;
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (value: boolean) => void;
  lastVisitedTab: string | null;
  setLastVisitedTab: (tab: string) => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFeedAlreadyLoaded, setIsFeedAlreadyLoaded] = useState(false);
  const [hasSeenWelcome, _setHasSeenWelcome] = useState(false);
  const [lastVisitedTab, _setLastVisitedTab] = useState<string | null>(null);

  const setFeedAlreadyLoaded = useCallback((value: boolean) => {
    setIsFeedAlreadyLoaded(value);
  }, []);

  const setHasSeenWelcome = useCallback((value: boolean) => {
    _setHasSeenWelcome(value);
  }, []);

  const setLastVisitedTab = useCallback((tab: string) => {
    _setLastVisitedTab(tab);
  }, []);

  const resetSession = useCallback(() => {
    setIsFeedAlreadyLoaded(false);
    _setHasSeenWelcome(false);
    _setLastVisitedTab(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        isFeedAlreadyLoaded,
        setFeedAlreadyLoaded,
        hasSeenWelcome,
        setHasSeenWelcome,
        lastVisitedTab,
        setLastVisitedTab,
        resetSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
