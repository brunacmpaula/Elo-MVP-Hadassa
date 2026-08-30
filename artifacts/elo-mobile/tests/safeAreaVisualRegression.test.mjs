import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { getVisibleMissionaries } from '../lib/privacy.js';
import { filterMissionaries } from '../lib/search.js';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testsDirectory, '..');

function source(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

const sources = {
  rootLayout: source('app/_layout.tsx'),
  tabsLayout: source('app/(tabs)/_layout.tsx'),
  safeArea: source('components/AppSafeAreaView.tsx'),
  packageJson: source('package.json'),
  login: source('app/index.tsx'),
  button: source('components/Button.tsx'),
  missionaryHome: source('components/MissionaryHome.tsx'),
  supporterHome: source('components/SupporterHome.tsx'),
  explore: source('app/(tabs)/explore.tsx'),
  queue: source('app/(tabs)/sync.tsx'),
  missionaryProfile: source('components/MissionaryProfile.tsx'),
  supporterProfile: source('components/SupporterProfile.tsx'),
  missionaryDetail: source('app/missionary/[id].tsx'),
  postDetail: source('app/post/[id].tsx'),
  compose: source('components/ComposePostModal.tsx'),
  postCard: source('components/PostCard.tsx'),
  nativeIosFlow: source('tests/native/image-picker.ios.yaml'),
  nativeAndroidFlow: source('tests/native/image-picker.android.yaml'),
  nativeRunner: source('tests/native/run-image-picker.mjs'),
  nativeFixturePrep: source('tests/native/prepare-image-fixtures.mjs'),
};

const packageManifest = JSON.parse(sources.packageJson);
const nativeTabsPolicy = packageManifest.safeAreaPolicy?.nativeTabs;

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
    tabbed: true,
    source: sources.missionaryHome,
    rootTestId: 'missionary-home-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device, nativeTabs) =>
      tabContentBottomPadding(device.insets, nativeTabs, 100, 'automatic') +
      (nativeTabs ? device.insets.bottom : 0),
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
    tabbed: true,
    source: sources.supporterHome,
    rootTestId: 'supporter-home-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device, nativeTabs) =>
      tabContentBottomPadding(device.insets, nativeTabs, 100, 'automatic') +
      (nativeTabs ? device.insets.bottom : 0),
    required: [
      '<AppSafeAreaView',
      'edges={[' + "'top'" + ']}',
      'useTabContentBottomPadding',
      'testID="supporter-home-screen"',
    ],
  },
  {
    id: 'explore-tab',
    tabbed: true,
    source: sources.explore,
    rootTestId: 'explore-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device, nativeTabs) =>
      tabContentBottomPadding(device.insets, nativeTabs, 100, 'automatic') +
      (nativeTabs ? device.insets.bottom : 0),
    required: [
      '<AppSafeAreaView',
      'edges={[' + "'top'" + ']}',
      'useTabContentBottomPadding',
      'testID="explore-screen"',
      'testID="explore-search-input"',
      'testID="explore-search-clear"',
      'testID="explore-no-results"',
    ],
  },
  {
    id: 'sync-queue-tab',
    tabbed: true,
    source: sources.queue,
    rootTestId: 'sync-queue-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device, nativeTabs) =>
      nativeTabs
        ? tabContentBottomPadding(device.insets, true, 90, 'never')
        : Math.max(84, tabContentBottomPadding(device.insets, false) - 16),
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
    tabbed: true,
    source: sources.missionaryProfile,
    rootTestId: 'missionary-profile-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device, nativeTabs) =>
      nativeTabs
        ? tabContentBottomPadding(device.insets, true, 90, 'never')
        : tabContentBottomPadding(device.insets, false, 90),
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
    tabbed: true,
    source: sources.supporterProfile,
    rootTestId: 'supporter-profile-screen',
    topClearance: (device) => device.insets.top,
    bottomClearance: (device, nativeTabs) =>
      nativeTabs
        ? tabContentBottomPadding(device.insets, true, 90, 'never')
        : tabContentBottomPadding(device.insets, false, 90),
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
      "height: '92%'",
      'paddingTop: 10',
      "paddingBottom: Math.max(insets.bottom, 20)",
      'testID="compose-post-sheet"',
      'testID="close-compose-post"',
      'testID="save-post"',
    ],
  },
];

const CLASSIC_TAB_BAR_CLEARANCE = 84;
const NATIVE_TAB_BAR_HEIGHT = 50;

function tabContentBottomPadding(
  insets,
  nativeTabs,
  minimum = 100,
  contentInsetAdjustmentBehavior = 'never',
) {
  if (nativeTabs) {
    if (contentInsetAdjustmentBehavior === 'automatic') {
      return NATIVE_TAB_BAR_HEIGHT;
    }
    return Math.max(minimum, insets.bottom + NATIVE_TAB_BAR_HEIGHT);
  }
  return Math.max(minimum, insets.bottom + CLASSIC_TAB_BAR_CLEARANCE);
}

function safeFrame(device) {
  return {
    top: device.insets.top,
    bottom: device.height - device.insets.bottom,
  };
}

function declaredVersion(dependency) {
  const match = dependency?.match(/(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `dependency must declare a semver-compatible version: ${dependency}`);
  return { major: Number(match[1]), minor: Number(match[2]) };
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

test('pins NativeTabs geometry to the supported Expo and iOS contract', () => {
  assert.deepEqual(nativeTabsPolicy, {
    expoSdkMajor: 54,
    expoRouterMajor: 6,
    expoGlassEffectMinor: 1,
    minimumIosMajor: 26,
    visibleTabBarHeight: 50,
  });

  assert.equal(
    declaredVersion(packageManifest.devDependencies.expo).major,
    nativeTabsPolicy.expoSdkMajor,
    'NativeTabs clearance must be rechecked when the Expo SDK major changes',
  );
  assert.equal(
    declaredVersion(packageManifest.devDependencies['expo-router']).major,
    nativeTabsPolicy.expoRouterMajor,
    'NativeTabs clearance must be rechecked when the Expo Router major changes',
  );
  assert.equal(
    declaredVersion(packageManifest.devDependencies['expo-glass-effect']).minor,
    nativeTabsPolicy.expoGlassEffectMinor,
    'Liquid Glass availability must be rechecked when expo-glass-effect changes',
  );
  assert.equal(nativeTabsPolicy.minimumIosMajor, 26);
  assert.match(
    sources.safeArea,
    new RegExp(`NATIVE_TAB_BAR_HEIGHT = ${nativeTabsPolicy.visibleTabBarHeight}\\b`),
  );
  assert.match(sources.safeArea, /Expo SDK 54 \/ Router 6 on iOS 26\+/);
});

test('keeps the login brand text-only while preserving its entry controls', () => {
  assert.doesNotMatch(sources.login, /\bImage\b|elo-logo|Logo do Elo|styles\.logo/);
  assert.match(sources.login, />Elo<\/Text>/);
  assert.match(sources.login, /Mesmo longe, juntos na missão\./);
  assert.match(sources.login, /testID="login-as-missionary"/);
  assert.match(sources.login, /testID="login-as-supporter"/);
});

test('keeps login actions accessible, distinct, and actionable', () => {
  const loginActions = [
    {
      testID: 'login-as-missionary',
      title: 'Sou Missionário',
      accessibilityLabel: 'Entrar como missionário',
      role: 'MISSIONARY',
    },
    {
      testID: 'login-as-supporter',
      title: 'Sou Apoiador',
      accessibilityLabel: 'Entrar como apoiador',
      role: 'SUPPORTER',
    },
  ];

  assert.match(sources.button, /accessibilityRole="button"/);
  assert.match(sources.button, /accessibilityLabel=\{accessibilityLabel \|\| title\}/);
  assert.match(sources.button, /<Pressable[\s\S]*onPress=\{handlePress\}/);
  assert.match(sources.button, /disabled=\{disabled \|\| loading\}/);

  const accessibleNames = new Set();
  for (const action of loginActions) {
    const buttonSource = sources.login.match(
      new RegExp(`<Button\\s[\\s\\S]*?testID="${action.testID}"[\\s\\S]*?\/>`),
    )?.[0];

    assert.ok(buttonSource, `${action.testID}: login control must use the shared Button`);
    assert.match(buttonSource, new RegExp(`title="${action.title}"`));
    assert.match(buttonSource, new RegExp(`accessibilityLabel="${action.accessibilityLabel}"`));
    assert.match(buttonSource, new RegExp(`onPress=\\{\\(\\) => loginAs\\('${action.role}'\\)\\}`));
    assert.match(buttonSource, new RegExp(`testID="${action.testID}"`));

    assert.ok(action.accessibilityLabel.trim().length > 0);
    accessibleNames.add(action.accessibilityLabel);
  }

  assert.equal(
    accessibleNames.size,
    loginActions.length,
    'login actions must have distinguishable accessible names',
  );
});

test('keeps both tab-bar modes safe on iPhone, Android and web', () => {
  assert.match(sources.tabsLayout, /useSafeAreaInsets/);
  assert.match(sources.tabsLayout, /paddingBottom: isWeb \? 0 : insets\.bottom/);
  assert.match(sources.tabsLayout, /\.\.\.\(isWeb \? \{ height: 84 \} : \{\}\)/);
  assert.match(sources.tabsLayout, /<NativeTabs>/);
  assert.match(sources.tabsLayout, /return <ClassicTabLayout \/>/);
  assert.match(
    sources.safeArea,
    new RegExp(`NATIVE_TAB_BAR_HEIGHT = ${nativeTabsPolicy.visibleTabBarHeight}\\b`),
  );
  assert.match(sources.safeArea, /contentInsetAdjustmentBehavior: 'automatic' \| 'never'/);
  assert.match(sources.safeArea, /return NATIVE_TAB_BAR_HEIGHT/);
  assert.match(sources.safeArea, /bottom \+ NATIVE_TAB_BAR_HEIGHT/);

  for (const device of devices) {
    const frame = safeFrame(device);
    const classicContentClearance = tabContentBottomPadding(device.insets, false);

    assert.ok(
      classicContentClearance >= device.insets.bottom + 84,
      `${device.id}: classic tab content must clear the tab bar and bottom inset`,
    );
    assert.ok(frame.top >= device.insets.top);
    assert.ok(frame.bottom <= device.height - device.insets.bottom);

    if (device.id.startsWith('iphone')) {
      const nativeScrollPadding = tabContentBottomPadding(
        device.insets,
        true,
        100,
        'automatic',
      );
      const nativeFixedPadding = tabContentBottomPadding(
        device.insets,
        true,
        90,
        'never',
      );
      const nativeFullClearance = device.insets.bottom + NATIVE_TAB_BAR_HEIGHT;

      assert.equal(
        nativeScrollPadding,
        NATIVE_TAB_BAR_HEIGHT,
        `${device.id}: automatic native scroll padding must exclude the already-applied bottom inset`,
      );
      assert.ok(
        nativeScrollPadding + device.insets.bottom >= nativeFullClearance,
        `${device.id}: native scroll content must clear the full tab bar`,
      );
      assert.ok(
        nativeFixedPadding >= nativeFullClearance,
        `${device.id}: fixed native-tab actions must clear the tab bar and home indicator`,
      );
    }
  }
});

test('keeps Explore search local, accessible, accent-insensitive, and privacy-aware', () => {
  assert.match(sources.explore, /useState<string>\(''\)/);
  assert.match(sources.explore, /filterMissionaries, normalizeSearchText/);
  assert.match(sources.explore, /from '\.\.\/\.\.\/lib\/search'/);
  assert.match(sources.explore, /getVisibleMissionaries\(missionaries, isFetching\)/);
  assert.match(sources.explore, /visibleMissionaries \?\? \[\]/);
  assert.match(sources.explore, /placeholder="Buscar por nome ou região"/);
  assert.match(sources.explore, /accessibilityLabel="Buscar missionários por nome ou região"/);
  assert.match(sources.explore, /accessibilityLabel="Limpar busca"/);
  assert.match(sources.explore, /onPress=\{\(\) => setSearchQuery\(''\)\}/);
  assert.match(sources.explore, /keyboardShouldPersistTaps="handled"/);
  assert.match(sources.explore, /keyboardDismissMode="on-drag"/);
  assert.match(sources.explore, /contentInsetAdjustmentBehavior=\{nativeTabs \? 'automatic' : 'never'\}/);
  assert.match(sources.explore, /paddingBottom: listBottomPadding/);
  assert.match(sources.explore, /Nenhum missionário encontrado\./);
  assert.match(sources.explore, /Tente buscar por outro nome ou região\./);
});

test('keeps Explore results usable and privacy-safe through a periodic refresh', () => {
  const cachedMissionaries = [
    {
      id: 'missionary-ana',
      userId: 'user-ana',
      name: 'Ana Silva',
      email: 'ana@elo.demo',
      bio: 'Biografia em cache',
      country: 'Moçambique',
      initials: 'AS',
      isFollowed: false,
      latestPostType: 'UPDATE',
    },
    {
      id: 'missionary-joao',
      userId: 'user-joao',
      name: 'João Santos',
      email: 'joao@elo.demo',
      bio: 'Outra biografia em cache',
      country: 'Brasil',
      initials: 'JS',
      isFollowed: true,
      latestPostType: 'PRAYER_REQUEST',
    },
  ];
  const refreshedMissionaries = cachedMissionaries.map((missionary) => ({
    ...missionary,
    email: undefined,
    bio: undefined,
  }));

  const duringRefresh = getVisibleMissionaries(cachedMissionaries, true);
  assert.ok(duringRefresh);
  assert.deepEqual(
    duringRefresh.map(({ id }) => id),
    cachedMissionaries.map(({ id }) => id),
    'cached rows must remain available for navigation while the request is in flight',
  );
  assert.equal('country' in duringRefresh[0], false);
  assert.equal('email' in duringRefresh[0], false);
  assert.equal('bio' in duringRefresh[0], false);
  assert.deepEqual(
    filterMissionaries(duringRefresh, 'Ana Silva'),
    [duringRefresh[0]],
    'search must continue to use public names during refresh',
  );
  assert.deepEqual(
    filterMissionaries(duringRefresh, 'Moçambique'),
    [],
    'search must not use a cached private location during refresh',
  );

  const afterRefresh = getVisibleMissionaries(refreshedMissionaries, false);
  assert.deepEqual(
    filterMissionaries(afterRefresh, 'mocambique'),
    [afterRefresh[0]],
    'a public location returned by the completed refresh must be searchable again',
  );
  assert.equal(afterRefresh[0].country, 'Moçambique');
});

test('filters real missionary data through the Explore search interaction', () => {
  const missionaries = [
    {
      id: 'missionary-ana',
      name: 'Ana Silva',
      country: 'Moçambique',
    },
    {
      id: 'missionary-joao',
      name: 'João Santos',
      country: 'Brasil',
    },
    {
      id: 'missionary-lucia',
      name: 'Lúcia Nascimento',
      country: 'Peru',
    },
    {
      id: 'missionary-private-location',
      name: 'Rita Esperança',
    },
  ];

  assert.deepEqual(
    filterMissionaries(missionaries, '  JOÃO  '),
    [missionaries[1]],
    'name matches should ignore case, accents, and surrounding whitespace',
  );
  assert.deepEqual(
    filterMissionaries(missionaries, ' mocambique '),
    [missionaries[0]],
    'country matches should ignore case, accents, and surrounding whitespace',
  );
  assert.deepEqual(
    filterMissionaries(missionaries, '  '),
    missionaries,
    'clearing the query should restore every missionary',
  );
  assert.deepEqual(
    filterMissionaries(missionaries, 'argentina'),
    [],
    'an unmatched query should produce the empty state data',
  );
  assert.deepEqual(
    filterMissionaries(missionaries, 'Portugal'),
    [],
    'a missionary with an omitted country must not match a hidden location',
  );
});

test('keeps compose message before update-only images and clears hidden media', () => {
  const messagePosition = sources.compose.indexOf('Mensagem');
  const imagesPosition = sources.compose.indexOf('Imagens');

  assert.ok(messagePosition >= 0, 'compose form must keep the message field');
  assert.ok(imagesPosition >= 0, 'compose form must keep the image field');
  assert.ok(
    messagePosition < imagesPosition,
    'the message field must appear before the image section',
  );
  assert.match(
    sources.compose,
    /const handleTypeChange = \(nextType: PostInputType\) => \{\s*setType\(nextType\);\s*typeRef\.current = nextType;\s*if \(nextType !== 'UPDATE'\) \{\s*setMedia\(\[\]\);\s*setMediaError\(null\);\s*\}/,
    'leaving UPDATE must discard selected media and pending media errors',
  );
  assert.match(
    sources.compose,
    /onPress=\{\(\) => handleTypeChange\(item\.value\)\}/,
    'post type buttons must use the media-clearing type change handler',
  );
  assert.match(
    sources.compose,
    /\{type === 'UPDATE' && \(\s*<View style=\{styles\.field\}(?: testID="post-images-section")?>\s*<Text[\s\S]*?Imagens/,
    'the image section must render only for UPDATE posts',
  );
  assert.match(
    sources.compose,
    /type === 'UPDATE' \? media : \[\]/,
    'non-UPDATE posts must never submit media',
  );
});

test('keeps native image selection capped at four with visible previews', () => {
  assert.match(
    sources.compose,
    /const MAX_IMAGES = 4;/,
    'the composer must keep the four-image product limit',
  );
  assert.match(
    sources.compose,
    /allowsMultipleSelection: true,\s*selectionLimit: MAX_IMAGES - media\.length,/,
    'the native picker must allow multiple images but only the remaining slots',
  );
  assert.match(
    sources.compose,
    /setMedia\(\(current\) => \[\.\.\.current, \.\.\.prepared\]\.slice\(0, MAX_IMAGES\)\)/,
    'picker results must never append more than four images',
  );
  assert.match(
    sources.compose,
    /<Image source=\{\{ uri: item\.thumbnailUri \}\} style=\{styles\.previewImage\} \/>/,
    'each selected image must render a visible preview',
  );
  assert.match(
    sources.compose,
    /disabled=\{media\.length >= MAX_IMAGES\}/,
    'the picker button must be disabled once four images are selected',
  );
});

test('shows the contribution CTA only to supporters on need posts', () => {
  assert.match(
    sources.postDetail,
    /user\?\.role === 'SUPPORTER' && visiblePost\.type === 'NEED'/,
    'need contribution CTA must be restricted to supporters',
  );
  assert.match(
    sources.postDetail,
    /'Quero contribuir'/,
    'need contribution CTA must use the standardized label',
  );
  assert.match(
    sources.postDetail,
    /'Retirar minha disponibilidade'/,
    'registered availability must expose an accessible removal label',
  );
  assert.match(
    sources.postDetail,
    /testID="contribution-availability"/,
    'need contribution CTA must expose a stable selector',
  );
  assert.match(
    sources.postDetail,
    /title=\{visiblePost\.prayedByMe \? 'Estou Orando' : 'Orar'\}/,
    'need posts must keep the prayer action and state label',
  );
  assert.match(
    sources.postDetail,
    /prayerCount \+ 1/,
    'need posts must keep the optimistic prayer count behavior',
  );
  assert.match(
    sources.postDetail,
    /useCreateContributionAvailability/,
    'the contribution CTA must persist registered availability',
  );
  assert.match(
    sources.postDetail,
    /useRemoveContributionAvailability/,
    'the contribution CTA must allow availability removal',
  );
  assert.match(
    sources.postDetail,
    /Nenhum valor ou dado financeiro será solicitado/,
    'the contribution CTA must state that it does not start a financial flow',
  );
  assert.doesNotMatch(
    sources.postDetail,
    /visiblePost\.type === '(?:UPDATE|PRAYER_REQUEST)'[\s\S]*?contribution-availability/,
    'updates and prayer requests must not opt into contribution CTA rendering',
  );
});

test('shows contribution availabilities only to the missionary profile owner', () => {
  assert.match(
    sources.missionaryDetail,
    /user\?\.role === 'MISSIONARY' && user\.missionaryProfileId === id/,
    'availability visibility must be restricted to the profile owner',
  );
  assert.match(
    sources.missionaryDetail,
    /useListMissionaryContributionAvailabilities/,
    'missionary profile must load availability records',
  );
  assert.match(
    sources.missionaryDetail,
    /Disponibilidades para contribuir/,
    'missionary profile must identify the availability section',
  );
  assert.match(
    sources.missionaryDetail,
    /retry-contribution-availabilities/,
    'missionary profile must offer recovery after a loading error',
  );
  assert.doesNotMatch(
    sources.missionaryDetail,
    /demo-contribution/,
    'missionary profile must not keep the non-targeted demonstration CTA',
  );
});

test('keeps the native image-picker runner aligned with app selectors and payload checks', () => {
  assert.match(sources.compose, /testID=\{`post-type-\$\{item\.value\.toLowerCase\(\)\}`\}/);
  assert.match(sources.compose, /testID="title-publication"/);
  assert.match(sources.compose, /testID="content-publication"/);
  assert.match(sources.compose, /testID="post-images-section"/);
  assert.match(
    sources.compose,
    /testID=\{`post-image-preview-\$\{index \+ 1\}`\}/,
  );
  assert.match(sources.postCard, /testID="post-media"/);

  for (const [platform, flow] of [
    ['iOS', sources.nativeIosFlow],
    ['Android', sources.nativeAndroidFlow],
  ]) {
    assert.match(flow, /clearState: true/, `${platform}: flow must start clean`);
    assert.match(flow, /id: post-image-preview-1/);
    assert.match(flow, /id: post-image-preview-4/);
    assert.match(flow, /id: post-image-preview-5/);
    assert.match(flow, /id: post-type-prayer_request/);
    assert.match(flow, /id: post-type-need/);
    assert.match(flow, /Native image publication/);
    assert.match(flow, /Native text publication/);
    assert.match(flow, /id: post-media/);
  }

  assert.match(sources.nativeRunner, /prepare-image-fixtures\.mjs/);
  assert.match(sources.nativeRunner, /maestro/);
  assert.match(sources.nativeFixturePrep, /Array\.from\(\{ length: 5 \}/);
  assert.match(sources.nativeFixturePrep, /simctl.*addmedia|addmedia.*simctl/);
  assert.match(sources.nativeFixturePrep, /MEDIA_SCANNER_SCAN_FILE/);
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
      const nativeTabModes =
        scenario.tabbed && device.id.startsWith('iphone') ? [false, true] : [false];

      for (const nativeTabs of nativeTabModes) {
        const bottomClearance = scenario.bottomClearance(device, nativeTabs);

        assert.ok(
          topClearance >= frame.top,
          `${scenario.id}/${device.id}: top controls can overlap the status bar or notch`,
        );
        assert.ok(
          bottomClearance >= device.insets.bottom,
          `${scenario.id}/${device.id}/${nativeTabs ? 'native' : 'classic'}: bottom controls can overlap the home indicator`,
        );
        if (nativeTabs) {
          assert.ok(
            bottomClearance >= device.insets.bottom + NATIVE_TAB_BAR_HEIGHT,
            `${scenario.id}/${device.id}/native: bottom controls can overlap the native tab bar`,
          );
        }
        assert.ok(
          scenario.rootTestId.length > 0,
          `${scenario.id}: every visual scenario needs a stable root selector`,
        );
      }
    }
  });
}
