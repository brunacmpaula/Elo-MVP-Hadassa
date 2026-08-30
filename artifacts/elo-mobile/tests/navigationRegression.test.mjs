import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testsDirectory, '..');

function source(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

const authContext = source('context/AuthContext.tsx');
const rootLayout = source('app/_layout.tsx');
const login = source('app/index.tsx');
const tabsLayout = source('app/(tabs)/_layout.tsx');
const tabsIndex = source('app/(tabs)/index.tsx');
const missionaryHome = source('components/MissionaryHome.tsx');
const supporterHome = source('components/SupporterHome.tsx');

const AUTHENTICATED_FEED_ROUTE = '/(tabs)';

function loginDestination({ isLoading, isLoggingOut, user }) {
  if (isLoading || isLoggingOut) return 'transition';
  if (user) return AUTHENTICATED_FEED_ROUTE;
  return '/';
}

test('uses the grouped Feed route for both login profiles', () => {
  assert.match(login, /import \{ Redirect \} from 'expo-router';/);
  assert.match(
    login,
    /if \(user\) \{\s*return <Redirect href="\/\(tabs\)" \/>;\s*\}/,
  );
  assert.match(login, /onPress=\{\(\) => loginAs\('MISSIONARY'\)\}/);
  assert.match(login, /onPress=\{\(\) => loginAs\('SUPPORTER'\)\}/);
  assert.match(tabsIndex, /user\.role === 'MISSIONARY' \? <MissionaryHome \/> : <SupporterHome \/>/);
  assert.match(missionaryHome, /testID="missionary-home-screen"/);
  assert.match(supporterHome, /testID="supporter-home-screen"/);
});

test('does not replace the root navigator with an ambiguous index after login', () => {
  assert.doesNotMatch(authContext, /useRouter|router\.replace/);
  assert.match(authContext, /setUser\(session\.user\)/);
  assert.match(rootLayout, /<Stack\.Protected guard=\{!user\}>[\s\S]*<Stack\.Screen name="index" \/>/);
  assert.match(rootLayout, /<Stack\.Protected guard=\{!!user\}>[\s\S]*<Stack\.Screen name="\(tabs\)" \/>/);
  assert.match(tabsLayout, /<Tabs\.Screen\s+name="index"/);
});

test('restored and newly authenticated sessions resolve after the transition tree is ready', () => {
  assert.match(authContext, /AsyncStorage\.getItem\(USER_STORAGE_KEY\)/);
  assert.match(authContext, /AsyncStorage\.getItem\(TOKEN_STORAGE_KEY\)/);
  assert.match(authContext, /setUser\(restoredUser\)/);
  assert.match(authContext, /setIsLoading\(false\)/);

  assert.equal(loginDestination({ isLoading: true, isLoggingOut: false, user: null }), 'transition');
  assert.equal(
    loginDestination({
      isLoading: false,
      isLoggingOut: false,
      user: { role: 'MISSIONARY' },
    }),
    AUTHENTICATED_FEED_ROUTE,
  );
  assert.equal(
    loginDestination({
      isLoading: false,
      isLoggingOut: false,
      user: { role: 'SUPPORTER' },
    }),
    AUTHENTICATED_FEED_ROUTE,
  );
  assert.equal(
    loginDestination({
      isLoading: false,
      isLoggingOut: true,
      user: null,
    }),
    'transition',
  );
  assert.equal(
    loginDestination({ isLoading: false, isLoggingOut: false, user: null }),
    '/',
  );
});