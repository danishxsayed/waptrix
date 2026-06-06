"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface InboxContextProps {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
}

const InboxContext = createContext<InboxContextProps>({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export function InboxProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  return (
    <InboxContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </InboxContext.Provider>
  );
}

export const useInbox = () => useContext(InboxContext);
