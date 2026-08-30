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

const sources = {
  rootLayout: source('app/_layout.tsx'),
  tabsLayout: source('app/(tabs)/_layout.tsx'),
  safeArea: source('components/AppSafeAreaView.tsx'),
  login: source('app/index.tsx'),
  missionaryHome: source('components/MissionaryHome.tsx'),
  supporterHome: source('components/SupporterHome.tsx'),
  explore: source('app/(tabs)/explore.tsx'),
  queue: source('app/(tabs)/sync.tsx'),
  missionaryProfile: source('components/MissionaryProfile.tsx'),
  supporterProfile: source('components/SupporterProfile.tsx'),
  missionaryDetail: source('app/missionary/[id].tsx'),
  postDetail: source('app/post/[id].tsx'),
  compose: source('components/ComposePostModal.tsx'),
};

const devices = [
  {
    id: 'iphone-notch',
    width: 390,
    height: 844,
    insets: { top: 47, bottom: 34 },
  },
  {
    id: 'iphone-dynamic-island',
    width: 393,
    height: 852,
    insets: { top: 59, bottom: 34 },
  },
  {
    id: 'android',
    width: 400,
    height: 800,
    insets: { top: 24, bottom: 24 },
  },
  {
    id: 'web',
    width: 400,
    height: 720,
    insets: { top: 67, bottom: 34 },
  },
];

const screenScenarios = [
  {
    id: 'login',
    source: sources.login,
    rootTestId: 'login-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) => device.insets.bottom,
    required: [
      '<AppSafeAreaView',
      'testID="login-screen"',
      'testID="login-as-missionary"',
      'testID="login-as-supporter"',
    ],
  },
  {
    id: 'missionary-tabs',
    source: sources.missionaryHome,
    rootTestId: 'missionary-home-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) => tabContentBottomPadding(device.insets, false),
    required: [
      '<AppSafeAreaView',
      'edges={[' + "'top'" + ']}',
      'useTabContentBottomPadding',
      'testID="missionary-home-screen"',
      'testID="open-compose-post"',
    ],
  },
  {
    id: 'supporter-tabs',
    source: sources.supporterHome,
    rootTestId: 'supporter-home-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) => tabContentBottomPadding(device.insets, false),
    required: [
      '<AppSafeAreaView',
      'edges={[' + "'top'" + ']}',
      'useTabContentBottomPadding',
      'testID="supporter-home-screen"',
    ],
  },
  {
    id: 'explore-tab',
    source: sources.explore,
    rootTestId: 'explore-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) => tabContentBottomPadding(device.insets, false),
    required: [
      '<AppSafeAreaView',
      'edges={[' + "'top'" + ']}',
      'useTabContentBottomPadding',
      'testID="explore-screen"',
    ],
  },
  {
    id: 'sync-queue-tab',
    source: sources.queue,
    rootTestId: 'sync-queue-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) =>
      Math.max(84, tabContentBottomPadding(device.insets, false) - 16),
    required: [
      '<AppSafeAreaView',
      'edges={[' + "'top'" + ']}',
      'useTabContentBottomPadding',
      'footerBottomPadding',
      'testID="sync-queue-screen"',
      'testID="sync-now"',
    ],
  },
  {
    id: 'missionary-profile-tab',
    source: sources.missionaryProfile,
    rootTestId: 'missionary-profile-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) => tabContentBottomPadding(device.insets, false, 90),
    required: [
      '<AppSafeAreaView',
      'edges={[' + "'top'" + ']}',
      'useTabContentBottomPadding(90)',
      'testID="missionary-profile-screen"',
      'testID="missionary-logout"',
    ],
  },
  {
    id: 'supporter-profile-tab',
    source: sources.supporterProfile,
    rootTestId: 'supporter-profile-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) => tabContentBottomPadding(device.insets, false, 90),
    required: [
      '<AppSafeAreaView',
      'edges={[' + "'top'" + ']}',
      'useTabContentBottomPadding(90)',
      'testID="supporter-profile-screen"',
      'testID="supporter-logout"',
    ],
  },
  {
    id: 'missionary-detail',
    source: sources.missionaryDetail,
    rootTestId: 'missionary-detail-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) => device.insets.bottom + 24,
    required: [
      'useAppSafeAreaInsets',
      'contentContainerStyle={{ paddingBottom: bottom + 24 }}',
      'testID="missionary-detail-screen"',
    ],
  },
  {
    id: 'post-detail',
    source: sources.postDetail,
    rootTestId: 'post-detail-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device) => device.insets.bottom + 24,
    required: [
      'useAppSafeAreaInsets',
      'contentContainerStyle={{ paddingBottom: bottom + 24 }}',
      'testID="post-detail-screen"',
      'testID="pray-for-post"',
    ],
  },
  {
    id: 'new-post',
    source: sources.compose,
    rootTestId: 'compose-post-sheet',
    // The sheet is bottom-anchored. At its maximum height, its top starts
    // after the 8% remaining viewport plus the internal top padding.
    topClearance: (device) => device.height * 0.08 + 10,
    bottomClearance: (device) => Math.max(device.insets.bottom, 20),
    required: [
      'useAppSafeAreaInsets',
      "maxHeight: '92%'",
      'paddingTop: 10',
      "paddingBottom: Math.max(insets.bottom, 20)",
      'testID="compose-post-sheet"',
      'testID="close-compose-post"',
      'testID="save-post"',
    ],
  },
];

function tabContentBottomPadding(insets, nativeTabs, minimum = 100) {
  if (nativeTabs) return 16;
  return Math.max(minimum, insets.bottom + 84);
}

function safeFrame(device) {
  return {
    top: device.insets.top,
    bottom: device.height - device.insets.bottom,
  };
}

test('keeps the safe-area provider and platform policies wired at the app boundary', () => {
  assert.match(sources.rootLayout, /<SafeAreaProvider>/);
  assert.match(sources.rootLayout, /<RootLayoutNav \/>/);
  assert.match(sources.safeArea, /edges=\{isWeb \? \[\] : edges\}/);
  assert.match(sources.safeArea, /WEB_TOP_INSET = 67/);
  assert.match(sources.safeArea, /WEB_BOTTOM_INSET = 34/);
  assert.match(sources.safeArea, /top: Platform\.OS === 'web' \? WEB_TOP_INSET : insets\.top/);
  assert.match(sources.safeArea, /bottom: Platform\.OS === 'web' \? WEB_BOTTOM_INSET : insets\.bottom/);
});

test('keeps both tab-bar modes safe on iPhone, Android and web', () => {
  assert.match(sources.tabsLayout, /useSafeAreaInsets/);
  assert.match(sources.tabsLayout, /paddingBottom: isWeb \? 0 : insets\.bottom/);
  assert.match(sources.tabsLayout, /\.\.\.\(isWeb \? \{ height: 84 \} : \{\}\)/);
  assert.match(sources.tabsLayout, /<NativeTabs>/);
  assert.match(sources.tabsLayout, /return <ClassicTabLayout \/>/);

  for (const device of devices) {
    const frame = safeFrame(device);
    const classicContentClearance = tabContentBottomPadding(device.insets, false);
    const nativeContentClearance = tabContentBottomPadding(device.insets, true);

    assert.ok(
      classicContentClearance >= device.insets.bottom + 84,
      `${device.id}: classic tab content must clear the tab bar and bottom inset`,
    );
    assert.ok(
      nativeContentClearance >= 16,
      `${device.id}: native tab content must not end inside the native tab bar`,
    );
    assert.ok(frame.top >= device.insets.top);
    assert.ok(frame.bottom <= device.height - device.insets.bottom);
  }
});

for (const scenario of screenScenarios) {
  test(`visual contract: ${scenario.id} keeps controls inside the safe frame`, () => {
    for (const requiredFragment of scenario.required) {
      assert.ok(
        scenario.source.includes(requiredFragment),
        `${scenario.id}: missing ${requiredFragment}`,
      );
    }

    for (const device of devices) {
      const frame = safeFrame(device);
      const topClearance = scenario.topClearance(device);
      const bottomClearance = scenario.bottomClearance(device);

      assert.ok(
        topClearance >= frame.top,
        `${scenario.id}/${device.id}: top controls can overlap the status bar or notch`,
      );
      assert.ok(
        bottomClearance >= device.insets.bottom,
        `${scenario.id}/${device.id}: bottom controls can overlap the home indicator`,
      );
      assert.ok(
        scenario.rootTestId.length > 0,
        `${scenario.id}: every visual scenario needs a stable root selector`,
      );
    }
  });
}
