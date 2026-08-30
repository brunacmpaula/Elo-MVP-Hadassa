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
  markOperationFailed,
  markOperationSucceeded,
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
  assert.equal(
    acknowledged.localPosts.filter((post) => post.id === published.id).length,
    1,
  );
  assert.equal(acknowledged.localPosts.length, 1);
  assert.equal(acknowledged.localPosts[0]?.status, 'PUBLISHED');
});