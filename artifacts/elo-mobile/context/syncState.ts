import type { Post, PostInputType } from '@workspace/api-client-react';

export type SyncOp = {
  id: string;
  type: 'CREATE_POST';
  payload: {
    title: string;
    content: string;
    type: PostInputType;
    clientOperationId: string;
  };
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
};

export type SyncState = {
  queue: SyncOp[];
  localPosts: Post[];
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

export function markOperationSucceeded(
  state: SyncState,
  operationId: string,
  publishedPost: Post,
): SyncState {
  return {
    queue: state.queue.filter((operation) => operation.id !== operationId),
    localPosts: dedupePosts([
      { ...publishedPost, status: 'PUBLISHED' },
      ...state.localPosts.filter(
        (post) => post.id !== operationId && post.id !== publishedPost.id,
      ),
    ]),
  };
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