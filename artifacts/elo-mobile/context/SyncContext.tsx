import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, PostInputType, createPost, getListPostsQueryKey } from '@workspace/api-client-react';
import { useAuth } from './AuthContext';
import { useOfflineMode } from './OfflineContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  dedupePosts,
  dedupeQueue,
  enqueuePendingPost,
  getPendingOperations,
  markOperationFailed,
  markOperationSucceeded,
  type SyncOp,
} from './syncState';

export type { SyncOp } from './syncState';

type SyncContextType = {
  queue: SyncOp[];
  localPosts: Post[];
  enqueueCreatePost: (title: string, content: string, type: PostInputType) => Promise<void>;
  syncNow: () => Promise<void>;
  clearLocal: () => Promise<void>;
  isSyncing: boolean;
};

type StoredSyncState = {
  queue: SyncOp[];
  localPosts: Post[];
};

const SyncContext = createContext<SyncContextType | null>(null);

const SYNC_STATE_KEY = '@elo:sync-state';
const LEGACY_QUEUE_KEY = '@elo:queue';
const LEGACY_POSTS_KEY = '@elo:posts';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOfflineMode, isConnectionKnown } = useOfflineMode();
  const queryClient = useQueryClient();

  const [queue, setQueue] = useState<SyncOp[]>([]);
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const queueRef = useRef<SyncOp[]>([]);
  const localPostsRef = useRef<Post[]>([]);
  const isSyncingRef = useRef(false);
  const stateReadyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadState = async () => {
      const storedState = await AsyncStorage.getItem(SYNC_STATE_KEY);
      let nextQueue: SyncOp[] = [];
      let nextPosts: Post[] = [];

      if (storedState) {
        const parsed = JSON.parse(storedState) as Partial<StoredSyncState>;
        nextQueue = Array.isArray(parsed.queue) ? parsed.queue : [];
        nextPosts = Array.isArray(parsed.localPosts) ? parsed.localPosts : [];
      } else {
        // Read the old keys once so existing offline work survives the storage
        // format upgrade.
        const [storedQueue, storedPosts] = await Promise.all([
          AsyncStorage.getItem(LEGACY_QUEUE_KEY),
          AsyncStorage.getItem(LEGACY_POSTS_KEY),
        ]);
        nextQueue = storedQueue ? JSON.parse(storedQueue) : [];
        nextPosts = storedPosts ? JSON.parse(storedPosts) : [];
      }

      queueRef.current = dedupeQueue(nextQueue);
      localPostsRef.current = dedupePosts(nextPosts);

      if (isMounted) {
        setQueue(queueRef.current);
        setLocalPosts(localPostsRef.current);
        setIsStateLoaded(true);
      }
    };

    stateReadyRef.current = loadState().catch((error) => {
      // Keep the provider usable if storage is temporarily unavailable. Any
      // operation created afterwards is still kept in memory and retried by
      // the normal sync flow.
      console.error('Unable to load offline sync state', error);
      if (isMounted) setIsStateLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const persistState = async (nextQueue: SyncOp[], nextPosts: Post[]) => {
    const state: StoredSyncState = {
      queue: dedupeQueue(nextQueue),
      localPosts: dedupePosts(nextPosts),
    };
    await AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
  };

  const applyState = (nextQueue: SyncOp[], nextPosts: Post[]) => {
    const normalizedQueue = dedupeQueue(nextQueue);
    const normalizedPosts = dedupePosts(nextPosts);
    queueRef.current = normalizedQueue;
    localPostsRef.current = normalizedPosts;
    setQueue(normalizedQueue);
    setLocalPosts(normalizedPosts);
  };

  const enqueueCreatePost = async (title: string, content: string, type: PostInputType) => {
    if (stateReadyRef.current) {
      await stateReadyRef.current;
    }

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

    const nextState = enqueuePendingPost(
      { queue: queueRef.current, localPosts: localPostsRef.current },
      newPost,
      op,
    );

    applyState(nextState.queue, nextState.localPosts);
    await persistState(nextState.queue, nextState.localPosts);

    if (isConnectionKnown && !isOfflineMode) {
      // syncNow reads from refs, so this cannot use a stale queue captured
      // before the newly created operation was added.
      void syncNow();
    }
  };

  const syncNow = async () => {
    if (!isConnectionKnown || isOfflineMode || isSyncingRef.current) return;
    
    const pending = getPendingOperations(queueRef.current);
    if (pending.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    let currentQueue = [...queueRef.current];
    let currentPosts = [...localPostsRef.current];
    const originalQueueIds = new Set(currentQueue.map((operation) => operation.id));
    const originalPostIds = new Set(currentPosts.map((post) => post.id));

    // A post can be created while another request is in flight. Keep those
    // entries when applying the in-flight snapshot back to React state.
    const applySyncState = () => {
      const concurrentQueue = queueRef.current.filter(
        (operation) => !originalQueueIds.has(operation.id),
      );
      const concurrentPosts = localPostsRef.current.filter(
        (post) => !originalPostIds.has(post.id),
      );
      applyState(
        [...currentQueue, ...concurrentQueue],
        [...currentPosts, ...concurrentPosts],
      );
    };

    try {
      for (const op of pending) {
        currentQueue = currentQueue.map((q) =>
          q.id === op.id ? { ...q, status: 'SYNCING' } : q,
        );
        applySyncState();

        try {
          if (op.type === 'CREATE_POST') {
            const res = await createPost({
              missionaryId: user?.id || 'm1',
              type: op.payload.type,
              title: op.payload.title,
              content: op.payload.content,
              clientOperationId: op.payload.clientOperationId,
            });

            const succeeded = markOperationSucceeded(
              { queue: currentQueue, localPosts: currentPosts },
              op.id,
              res,
            );
            currentQueue = succeeded.queue;
            currentPosts = succeeded.localPosts;
          }
        } catch (err) {
          const failed = markOperationFailed(
            { queue: currentQueue, localPosts: currentPosts },
            op.id,
          );
          currentQueue = failed.queue;
          currentPosts = failed.localPosts;
        }
        applySyncState();
      }

      // Preserve operations/posts added while requests were in flight. The
      // queue is deduplicated before committing, so a repeated identifier can
      // only be sent once by this client.
      const concurrentQueue = queueRef.current.filter(
        (operation) => !originalQueueIds.has(operation.id),
      );
      const concurrentPosts = localPostsRef.current.filter(
        (post) => !originalPostIds.has(post.id),
      );
      const finalQueue = dedupeQueue([...currentQueue, ...concurrentQueue]);
      const finalPosts = dedupePosts([...currentPosts, ...concurrentPosts]);

      applyState(finalQueue, finalPosts);
      await persistState(finalQueue, finalPosts);
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  const clearLocal = async () => {
    applyState([], []);
    await Promise.all([
      AsyncStorage.removeItem(SYNC_STATE_KEY),
      AsyncStorage.removeItem(LEGACY_POSTS_KEY),
      AsyncStorage.removeItem(LEGACY_QUEUE_KEY),
    ]);
  };

  // Attempt sync when coming online
  useEffect(() => {
    if (isStateLoaded && isConnectionKnown && !isOfflineMode) {
      void syncNow();
    }
  }, [isConnectionKnown, isOfflineMode, isStateLoaded]);

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
