import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Network from 'expo-network';

type OfflineContextType = {
  isOfflineMode: boolean;
  isConnectionKnown: boolean;
  connectionType: Network.NetworkStateType | undefined;
};

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [networkState, setNetworkState] = useState<Network.NetworkState>({
    isConnected: undefined,
    isInternetReachable: undefined,
    type: Network.NetworkStateType.UNKNOWN,
  });

  useEffect(() => {
    let isMounted = true;

    Network.getNetworkStateAsync().then((state) => {
      if (isMounted) setNetworkState(state);
    });

    const subscription = Network.addNetworkStateListener(setNetworkState);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const isConnectionKnown =
    networkState.isConnected !== undefined &&
    networkState.isInternetReachable !== undefined;
  const isOfflineMode =
    networkState.isConnected === false ||
    networkState.isInternetReachable === false;

  return (
    <OfflineContext.Provider
      value={{
        isOfflineMode,
        isConnectionKnown,
        connectionType: networkState.type,
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
