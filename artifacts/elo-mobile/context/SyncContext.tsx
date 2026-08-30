import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, PostInputType, createPost, getListPostsQueryKey } from '@workspace/api-client-react';
import { useAuth } from './AuthContext';
import { useOfflineMode } from './OfflineContext';
import { useQueryClient } from '@tanstack/react-query';

export type SyncOp = {
  id: string;
  type: 'CREATE_POST';
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
};

type SyncContextType = {
  queue: SyncOp[];
  localPosts: Post[];
  enqueueCreatePost: (title: string, content: string, type: PostInputType) => Promise<void>;
  syncNow: () => Promise<void>;
  clearLocal: () => Promise<void>;
  isSyncing: boolean;
};

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOfflineMode, isConnectionKnown } = useOfflineMode();
  const queryClient = useQueryClient();

  const [queue, setQueue] = useState<SyncOp[]>([]);
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      const storedQueue = await AsyncStorage.getItem('@elo:queue');
      const storedPosts = await AsyncStorage.getItem('@elo:posts');
      if (storedQueue) setQueue(JSON.parse(storedQueue));
      if (storedPosts) setLocalPosts(JSON.parse(storedPosts));
    };
    loadState();
  }, []);

  const enqueueCreatePost = async (title: string, content: string, type: PostInputType) => {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPost: Post = {
      id: localId,
      missionaryId: user?.id || 'm1',
      missionaryName: user?.name || 'Missionário',
      missionaryCountry: 'Desconhecido',
      type: type as any,
      title,
      content,
      status: 'PENDING_SYNC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prayerCount: 0,
      prayedByMe: false,
    };

    const op: SyncOp = {
      id: localId,
      type: 'CREATE_POST',
      payload: { title, content, type, clientOperationId: localId },
      status: 'PENDING',
      retryCount: 0,
    };

    const nextPosts = [newPost, ...localPosts];
    const nextQueue = [...queue, op];

    setLocalPosts(nextPosts);
    setQueue(nextQueue);
    await AsyncStorage.setItem('@elo:posts', JSON.stringify(nextPosts));
    await AsyncStorage.setItem('@elo:queue', JSON.stringify(nextQueue));

    if (isConnectionKnown && !isOfflineMode) {
      setTimeout(syncNow, 500);
    }
  };

  const syncNow = async () => {
    if (!isConnectionKnown || isOfflineMode || isSyncing) return;
    
    const pending = queue.filter((q) => q.status === 'PENDING' || q.status === 'FAILED');
    if (pending.length === 0) return;

    setIsSyncing(true);
    let currentQueue = [...queue];
    let currentPosts = [...localPosts];

    for (const op of pending) {
      currentQueue = currentQueue.map((q) => (q.id === op.id ? { ...q, status: 'SYNCING' } : q));
      setQueue([...currentQueue]);

      try {
        if (op.type === 'CREATE_POST') {
          const res = await createPost({
            missionaryId: user?.id || 'm1',
            type: op.payload.type,
            title: op.payload.title,
            content: op.payload.content,
            clientOperationId: op.payload.clientOperationId,
          });

          currentQueue = currentQueue.filter((q) => q.id !== op.id);
          currentPosts = currentPosts.map((p) =>
            p.id === op.id ? { ...res, status: 'PUBLISHED' } : p
          );
        }
      } catch (err) {
        currentQueue = currentQueue.map((q) =>
          q.id === op.id ? { ...q, status: 'FAILED', retryCount: q.retryCount + 1 } : q
        );
        currentPosts = currentPosts.map((p) =>
          p.id === op.id ? { ...p, status: 'SYNC_FAILED' } : p
        );
      }
    }

    setQueue(currentQueue);
    setLocalPosts(currentPosts);
    await AsyncStorage.setItem('@elo:posts', JSON.stringify(currentPosts));
    await AsyncStorage.setItem('@elo:queue', JSON.stringify(currentQueue));
    
    queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
    setIsSyncing(false);
  };

  const clearLocal = async () => {
    setQueue([]);
    setLocalPosts([]);
    await AsyncStorage.removeItem('@elo:posts');
    await AsyncStorage.removeItem('@elo:queue');
  };

  // Attempt sync when coming online
  useEffect(() => {
    if (isConnectionKnown && !isOfflineMode) {
      syncNow();
    }
  }, [isConnectionKnown, isOfflineMode]);

  return (
    <SyncContext.Provider
      value={{
        queue,
        localPosts,
        enqueueCreatePost,
        syncNow,
        clearLocal,
        isSyncing,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('Missing SyncProvider');
  return ctx;
};
