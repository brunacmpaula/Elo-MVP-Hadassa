import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  clearPersistedSession,
  SESSION_STORAGE_KEYS,
} from '../lib/authSession.js';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testsDirectory, '..');

function source(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

const authContext = source('context/AuthContext.tsx');
const rootLayout = source('app/_layout.tsx');
const login = source('app/index.tsx');
const profileRoute = source('app/(tabs)/profile.tsx');
const missionaryProfile = source('components/MissionaryProfile.tsx');
const supporterProfile = source('components/SupporterProfile.tsx');

function createStorage(initialValues, failingKey) {
  const values = new Map(Object.entries(initialValues));
  const removals = [];

  return {
    removals,
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async removeItem(key) {
      removals.push(key);
      if (key === failingKey) {
        throw new Error('storage unavailable');
      }
      values.delete(key);
    },
  };
}

test('logout removes the user, token and profile preferences before remount', async () => {
  const storage = createStorage({
    '@elo:user': JSON.stringify({ id: 'user-1' }),
    '@elo:token': 'token-1',
    '@elo:profile-preferences': JSON.stringify({ hiddenFields: ['email'] }),
  });

  await clearPersistedSession(storage);

  assert.deepEqual(storage.removals, SESSION_STORAGE_KEYS);
  for (const key of SESSION_STORAGE_KEYS) {
    const value = await storage.getItem(key);
    assert.equal(value, null, `${key} must not restore the old session`);
  }
});

test('logout attempts every persisted key and rejects safely when storage fails', async () => {
  const storage = createStorage(
    {
      '@elo:user': JSON.stringify({ id: 'user-1' }),
      '@elo:token': 'token-1',
      '@elo:profile-preferences': JSON.stringify({ hiddenFields: ['email'] }),
    },
    '@elo:user',
  );

  await assert.rejects(clearPersistedSession(storage), /Unable to clear/);
  assert.deepEqual(
    storage.removals,
    SESSION_STORAGE_KEYS,
    'one storage failure must not prevent attempts for the remaining keys',
  );
});

test('logout gates the tab tree and keeps the login route stable after remount', () => {
  assert.match(authContext, /isLoggingOut: boolean/);
  assert.match(authContext, /if \(logoutPromiseRef\.current\) return logoutPromiseRef\.current/);
  assert.match(authContext, /setIsLoggingOut\(true\)/);
  assert.match(authContext, /await clearPersistedSession\(AsyncStorage\)/);
  assert.match(authContext, /setUser\(null\)/);
  assert.doesNotMatch(authContext, /router\.replace/);
  assert.match(authContext, /AsyncStorage\.getItem\(TOKEN_STORAGE_KEY\)/);
  assert.match(rootLayout, /if \(isLoggingOut && !user\) return <LogoutTransition \/>/);
  assert.match(rootLayout, /<Stack\.Protected guard=\{!user\}>[\s\S]*<Stack\.Screen name="index" \/>/);
  assert.match(rootLayout, /<Stack\.Protected guard=\{!!user\}>[\s\S]*<Stack\.Screen name="\(tabs\)" \/>/);
  assert.match(login, /if \(isLoading \|\| isLoggingOut\)/);
  assert.match(profileRoute, /if \(isLoading\)/);
  assert.match(missionaryProfile, /loading=\{isLoggingOut\}/);
  assert.match(supporterProfile, /loading=\{isLoggingOut\}/);
});