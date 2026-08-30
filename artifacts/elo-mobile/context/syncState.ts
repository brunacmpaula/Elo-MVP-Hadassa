import type {
  Post,
  PostInputType,
  PostMediaInput,
} from '@workspace/api-client-react';

export type SyncOp = {
  id: string;
  type: 'CREATE_POST';
  payload: {
    title: string;
    content: string;
    type: PostInputType;
    clientOperationId: string;
    media: PostMediaInput[];
  };
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
};

export type SyncState = {
  queue: SyncOp[];
  localPosts: Post[];
};

export type QueueSummary = {
  publicationCount: number;
  imageCount: number;
  totalBytes: number;
  failedCount: number;
};

export function dedupeQueue(operations: SyncOp[]): SyncOp[] {
  const seen = new Set<string>();
  return operations.filter((operation) => {
    if (seen.has(operation.id)) return false;
    seen.add(operation.id);
    return true;
  });
}

export function dedupePosts(posts: Post[]): Post[] {
  const seen = new Set<string>();
  return posts.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

export function enqueuePendingPost(
  state: SyncState,
  post: Post,
  operation: SyncOp,
): SyncState {
  return {
    queue: dedupeQueue([...state.queue, operation]),
    localPosts: dedupePosts([post, ...state.localPosts]),
  };
}

export function getPendingOperations(queue: SyncOp[]): SyncOp[] {
  return dedupeQueue(queue).filter(
    (operation) => operation.status === 'PENDING' || operation.status === 'FAILED',
  );
}

export function hasUnprocessedPendingOperations(
  queue: SyncOp[],
  processedOperationIds: ReadonlySet<string>,
): boolean {
  return getPendingOperations(queue).some(
    (operation) => !processedOperationIds.has(operation.id),
  );
}

export function markOperationSucceeded(
  state: SyncState,
  operationId: string,
  _publishedPost: Post,
): SyncState {
  return {
    queue: state.queue.filter((operation) => operation.id !== operationId),
    localPosts: state.localPosts.filter((post) => post.id !== operationId),
  };
}

export function mergePublishedPost(
  posts: Post[] | undefined,
  publishedPost: Post,
): Post[] {
  return dedupePosts([
    publishedPost,
    ...(posts ?? []).filter((post) => post.id !== publishedPost.id),
  ]).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getQueueSummary(queue: SyncOp[]): QueueSummary {
  return dedupeQueue(queue).reduce<QueueSummary>(
    (summary, operation) => ({
      publicationCount: summary.publicationCount + 1,
      imageCount: summary.imageCount + operation.payload.media.length,
      totalBytes:
        summary.totalBytes +
        operation.payload.media.reduce(
          (total, item) => total + item.sizeBytes,
          0,
        ),
      failedCount:
        summary.failedCount + (operation.status === 'FAILED' ? 1 : 0),
    }),
    {
      publicationCount: 0,
      imageCount: 0,
      totalBytes: 0,
      failedCount: 0,
    },
  );
}

export function formatPendingBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getSyncBlockReason(input: {
  isConnectionKnown: boolean;
  isOffline: boolean;
  syncOnlyOnWifi: boolean;
  isWifi: boolean;
}): 'CHECKING_CONNECTION' | 'OFFLINE' | 'WIFI_REQUIRED' | null {
  if (!input.isConnectionKnown) return 'CHECKING_CONNECTION';
  if (input.isOffline) return 'OFFLINE';
  if (input.syncOnlyOnWifi && !input.isWifi) return 'WIFI_REQUIRED';
  return null;
}

export function markOperationFailed(
  state: SyncState,
  operationId: string,
): SyncState {
  return {
    queue: state.queue.map((operation) =>
      operation.id === operationId
        ? {
            ...operation,
            status: 'FAILED',
            retryCount: operation.retryCount + 1,
          }
        : operation,
    ),
    localPosts: state.localPosts.map((post) =>
      post.id === operationId ? { ...post, status: 'SYNC_FAILED' } : post,
    ),
  };
}

export function markOperationSyncing(
  state: SyncState,
  operationId: string,
): SyncState {
  return {
    queue: state.queue.map((operation) =>
      operation.id === operationId
        ? { ...operation, status: 'SYNCING' }
        : operation,
    ),
    localPosts: state.localPosts.map((post) =>
      post.id === operationId ? { ...post, status: 'PENDING_SYNC' } : post,
    ),
  };
}