import React from 'react';
import { Platform } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const WEB_TOP_INSET = 67;
const WEB_BOTTOM_INSET = 34;

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

export function useTabContentBottomPadding(minimum = 100) {
  const { bottom } = useAppSafeAreaInsets();

  // NativeTabs applies the bottom inset and tab-bar area automatically.
  if (usesNativeTabs()) {
    return 16;
  }

  // Classic Tabs are absolute, so leave enough room for the bar and the
  // device home/navigation indicator without relying on a fixed device inset.
  return Math.max(minimum, bottom + 84);
}