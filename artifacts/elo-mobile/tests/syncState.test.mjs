import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hideCachedMissionaryProfileFields,
  hideCachedPostFields,
} from '../lib/privacy.js';

test('removes cached private fields while a supporter device refreshes', () => {
  const cachedProfile = {
    id: 'missionary-ana',
    userId: 'user-ana',
    name: 'Ana Silva',
    email: 'ana@elo.demo',
    bio: 'Biografia ainda no cache',
    country: 'Moçambique',
    initials: 'AS',
    isFollowed: true,
    latestPostType: 'UPDATE',
    posts: [
      {
        id: 'post-cached',
        missionaryId: 'missionary-ana',
        missionaryName: 'Ana Silva',
        missionaryCountry: 'Moçambique',
        type: 'UPDATE',
        title: 'Atualização',
        content: 'Conteúdo',
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        prayerCount: 0,
        prayedByMe: false,
      },
    ],
  };

  const safeProfile = hideCachedMissionaryProfileFields(cachedProfile);
  assert.equal('email' in safeProfile, false);
  assert.equal('bio' in safeProfile, false);
  assert.equal('country' in safeProfile, false);
  assert.equal('missionaryCountry' in safeProfile.posts[0], false);
  assert.equal(
    'missionaryCountry' in hideCachedPostFields(cachedProfile.posts[0]),
    false,
  );
});
import {
  enqueuePendingPost,
  getPendingOperations,
  hasUnprocessedPendingOperations,
  markOperationFailed,
  markOperationSyncing,
  markOperationSucceeded,
  mergePublishedPost,
  sortMissionaryFeedPosts,
  getQueueSummary,
  getSyncBlockReason,
} from '../context/syncState.ts';

const operationId = 'local-offline-post-1';

function makePost(overrides = {}) {
  return {
    id: operationId,
    missionaryId: 'missionary-ana',
    missionaryName: 'Ana Silva',
    missionaryCountry: 'Moçambique',
    type: 'UPDATE',
    title: 'Notícias da missão',
    content: 'Uma publicação criada sem conexão.',
    status: 'PENDING_SYNC',
    createdAt: '2026-08-30T03:00:00.000Z',
    updatedAt: '2026-08-30T03:00:00.000Z',
    prayerCount: 0,
    prayedByMe: false,
    ...overrides,
  };
}

function makeOperation(overrides = {}) {
  return {
    id: operationId,
    type: 'CREATE_POST',
    payload: {
      title: 'Notícias da missão',
      content: 'Uma publicação criada sem conexão.',
      type: 'UPDATE',
      clientOperationId: operationId,
      media: [],
    },
    status: 'PENDING',
    retryCount: 0,
    ...overrides,
  };
}

test('keeps an offline post visible and pending until acknowledgement', () => {
  const state = enqueuePendingPost(
    { queue: [], localPosts: [] },
    makePost(),
    makeOperation(),
  );

  assert.equal(state.queue.length, 1);
  assert.equal(state.queue[0]?.status, 'PENDING');
  assert.equal(state.localPosts.length, 1);
  assert.equal(state.localPosts[0]?.status, 'PENDING_SYNC');
  assert.equal(state.localPosts[0]?.title, 'Notícias da missão');
});

test('exposes failed and pending operations when reconnection triggers synchronization', () => {
  const pending = getPendingOperations([
    makeOperation(),
    makeOperation({ status: 'FAILED', retryCount: 1 }),
  ]);

  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.id, operationId);
});

test('detects a new post enqueued while another synchronization is in flight', () => {
  const concurrentOperation = makeOperation({
    id: 'local-concurrent-post',
    payload: {
      ...makeOperation().payload,
      clientOperationId: 'local-concurrent-post',
    },
  });

  assert.equal(
    hasUnprocessedPendingOperations(
      [makeOperation(), concurrentOperation],
      new Set([operationId]),
    ),
    true,
  );
  assert.equal(
    hasUnprocessedPendingOperations(
      [makeOperation({ status: 'FAILED' })],
      new Set([operationId]),
    ),
    false,
  );
});

test('preserves a failed operation and its local post for another attempt', () => {
  const failed = markOperationFailed(
    {
      queue: [makeOperation()],
      localPosts: [makePost()],
    },
    operationId,
  );

  assert.equal(failed.queue.length, 1);
  assert.equal(failed.queue[0]?.status, 'FAILED');
  assert.equal(failed.queue[0]?.retryCount, 1);
  assert.equal(failed.localPosts.length, 1);
  assert.equal(failed.localPosts[0]?.status, 'SYNC_FAILED');
});

test('shows a failed post as pending again while a retry is in progress', () => {
  const syncing = markOperationSyncing(
    {
      queue: [makeOperation({ status: 'FAILED', retryCount: 1 })],
      localPosts: [makePost({ status: 'SYNC_FAILED' })],
    },
    operationId,
  );

  assert.equal(syncing.queue[0]?.status, 'SYNCING');
  assert.equal(syncing.localPosts[0]?.status, 'PENDING_SYNC');
});

test('acknowledges the same identifier without duplicate queue entries or posts', () => {
  const published = makePost({
    id: 'post-server-1',
    status: 'PUBLISHED',
  });

  const acknowledged = markOperationSucceeded(
    {
      queue: [makeOperation(), makeOperation()],
      localPosts: [makePost(), makePost()],
    },
    operationId,
    published,
  );

  assert.equal(acknowledged.queue.length, 0);
  assert.equal(acknowledged.localPosts.length, 0);
});

test('reconciles a confirmed post without duplicating an existing server item', () => {
  const published = makePost({
    id: 'post-server-1',
    status: 'PUBLISHED',
    createdAt: '2026-08-30T03:01:00.000Z',
  });

  const acknowledged = markOperationSucceeded(
    {
      queue: [makeOperation()],
      localPosts: [makePost(), published],
    },
    operationId,
    published,
  );

  assert.equal(acknowledged.localPosts.length, 1);
  assert.equal(acknowledged.localPosts[0]?.id, published.id);
});

test('merges the confirmed post into feed caches in newest-first order', () => {
  const older = makePost({
    id: 'post-older',
    status: 'PUBLISHED',
    createdAt: '2026-08-30T02:00:00.000Z',
  });
  const published = makePost({
    id: 'post-server-1',
    status: 'PUBLISHED',
    createdAt: '2026-08-30T03:01:00.000Z',
  });

  const feed = mergePublishedPost([older, published], published);

  assert.deepEqual(
    feed?.map((post) => post.id),
    ['post-server-1', 'post-older'],
  );
  assert.deepEqual(mergePublishedPost(undefined, published), [published]);
});

test('keeps unpublished missionary posts at the top of the feed', () => {
  const published = makePost({
    id: 'post-published',
    status: 'PUBLISHED',
    createdAt: '2026-08-30T04:00:00.000Z',
  });
  const failed = makePost({
    id: 'post-failed',
    status: 'SYNC_FAILED',
    createdAt: '2026-08-30T02:00:00.000Z',
  });
  const pending = makePost({
    id: 'post-pending',
    status: 'PENDING_SYNC',
    createdAt: '2026-08-30T01:00:00.000Z',
  });

  assert.deepEqual(
    sortMissionaryFeedPosts([published, pending, failed]).map(
      (post) => post.id,
    ),
    ['post-failed', 'post-pending', 'post-published'],
  );
});

test('adopts a newer canonical server version after acknowledgement', () => {
  const acknowledged = markOperationSucceeded(
    {
      queue: [makeOperation()],
      localPosts: [makePost()],
    },
    operationId,
    makePost({ id: 'post-server-1', status: 'PUBLISHED' }),
  );
  const refreshedServerPost = makePost({
    id: 'post-server-1',
    status: 'PUBLISHED',
    prayerCount: 7,
    updatedAt: '2026-08-30T04:00:00.000Z',
  });

  const refreshedFeed = mergePublishedPost(
    [makePost({ id: 'post-server-1', status: 'PUBLISHED' })],
    refreshedServerPost,
  );

  assert.equal(acknowledged.localPosts.length, 0);
  assert.equal(refreshedFeed[0]?.prayerCount, 7);
  assert.equal(refreshedFeed[0]?.updatedAt, '2026-08-30T04:00:00.000Z');
});

test('counts pending publications, images and total upload volume', () => {
  const media = [
    {
      clientMediaId: 'image-1',
      uri: 'data:image/jpeg;base64,YQ==',
      thumbnailUri: 'data:image/jpeg;base64,YQ==',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      width: 10,
      height: 10,
    },
  ];
  const summary = getQueueSummary([
    makeOperation({ payload: { ...makeOperation().payload, media } }),
  ]);
  assert.deepEqual(summary, {
    publicationCount: 1,
    imageCount: 1,
    totalBytes: 1024,
    failedCount: 0,
  });
});

test('blocks uploads offline and on mobile data when Wi-Fi is required', () => {
  assert.equal(
    getSyncBlockReason({
      isConnectionKnown: true,
      isOffline: true,
      syncOnlyOnWifi: false,
      isWifi: false,
    }),
    'OFFLINE',
  );
  assert.equal(
    getSyncBlockReason({
      isConnectionKnown: true,
      isOffline: false,
      syncOnlyOnWifi: true,
      isWifi: false,
    }),
    'WIFI_REQUIRED',
  );
  assert.equal(
    getSyncBlockReason({
      isConnectionKnown: true,
      isOffline: false,
      syncOnlyOnWifi: true,
      isWifi: true,
    }),
    null,
  );
});