import React from 'react';
import { Platform } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const WEB_TOP_INSET = 67;
const WEB_BOTTOM_INSET = 34;
const CLASSIC_TAB_BAR_CLEARANCE = 84;
// NativeTabs' visible tab controls occupy this height above the device inset.
// Scroll views using automatic adjustment receive the bottom inset from iOS.
const NATIVE_TAB_BAR_HEIGHT = 50;

type AppSafeAreaViewProps = React.ComponentProps<typeof SafeAreaView>;

function hasEdge(
  edges: AppSafeAreaViewProps['edges'],
  edge: 'top' | 'bottom',
) {
  if (Array.isArray(edges)) {
    return (edges as readonly string[]).includes(edge);
  }

  const edgeModes = edges as
    | Readonly<Partial<Record<'top' | 'bottom', string>>>
    | undefined;
  return edgeModes?.[edge] !== undefined && edgeModes[edge] !== 'off';
}

/**
 * App-wide safe-area policy.
 *
 * Native platforms receive the real device insets from SafeAreaProvider.
 * React Native Web does not expose status-bar/home-indicator insets, so the
 * preview gets the same visual breathing room explicitly.
 */
export function AppSafeAreaView({
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  ...props
}: AppSafeAreaViewProps) {
  const isWeb = Platform.OS === 'web';
  const webStyle = isWeb
    ? {
        ...(hasEdge(edges, 'top') ? { paddingTop: WEB_TOP_INSET } : {}),
        ...(hasEdge(edges, 'bottom') ? { paddingBottom: WEB_BOTTOM_INSET } : {}),
      }
    : undefined;

  return (
    <SafeAreaView
      {...props}
      edges={isWeb ? [] : edges}
      style={[style, webStyle]}
    />
  );
}

export function useAppSafeAreaInsets() {
  const insets = useSafeAreaInsets();

  return {
    ...insets,
    top: Platform.OS === 'web' ? WEB_TOP_INSET : insets.top,
    bottom: Platform.OS === 'web' ? WEB_BOTTOM_INSET : insets.bottom,
  };
}

export function usesNativeTabs() {
  // Keep this in sync with the tab layout's NativeTabs selection.
  return Platform.OS === 'ios' && isLiquidGlassAvailable();
}

export function useTabContentBottomPadding(
  minimum = 100,
  contentInsetAdjustmentBehavior: 'automatic' | 'never' = 'never',
) {
  const { bottom } = useAppSafeAreaInsets();

  // NativeTabs applies the device bottom inset automatically only when the
  // scroll view opts into automatic adjustment. Reserve the visible tab
  // controls here without adding the home indicator a second time.
  if (usesNativeTabs()) {
    if (contentInsetAdjustmentBehavior === 'automatic') {
      return NATIVE_TAB_BAR_HEIGHT;
    }

    // Fixed footers and manually adjusted content need both pieces of the
    // native tab-bar clearance because they are outside that scroll-view
    // adjustment.
    return Math.max(minimum, bottom + NATIVE_TAB_BAR_HEIGHT);
  }

  // Classic Tabs are absolute, so leave enough room for the bar and the
  // device home/navigation indicator without relying on a fixed device inset.
  return Math.max(minimum, bottom + CLASSIC_TAB_BAR_CLEARANCE);
}