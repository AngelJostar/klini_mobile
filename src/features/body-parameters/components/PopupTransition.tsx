import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

const PopupSession = createContext(false);

export function PopupTransitionProvider({ children }: PropsWithChildren) {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setOpened(true), 0);
    return () => clearTimeout(timer);
  }, []);
  return <PopupSession.Provider value={opened}>{children}</PopupSession.Provider>;
}

/** Only slide in when entering the flow, not when replacing its content. */
export function usePopupAlreadyOpen() {
  const opened = useContext(PopupSession);
  const [alreadyOpen] = useState(opened);
  return alreadyOpen;
}

