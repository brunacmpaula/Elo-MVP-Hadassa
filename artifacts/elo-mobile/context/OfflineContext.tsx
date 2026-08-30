import React, { createContext, useContext, useState } from 'react';

type OfflineContextType = {
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
};

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  return (
    <OfflineContext.Provider
      value={{
        isOfflineMode,
        toggleOfflineMode: () => setIsOfflineMode((prev) => !prev),
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export const useOfflineMode = () => {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('Missing OfflineProvider');
  return ctx;
};
