import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import {
  getListPostsQueryKey,
  useListPosts,
} from '@workspace/api-client-react';
import { useColors } from '../hooks/useColors';
import { PostCard } from './PostCard';
import {
  AppSafeAreaView,
  useTabContentBottomPadding,
  usesNativeTabs,
} from './AppSafeAreaView';
import { useFocusEffect } from 'expo-router';
import {
  hideCachedPostFields,
  PUBLIC_PRIVACY_QUERY_OPTIONS,
} from '../lib/privacy';

export function SupporterHome() {
  const colors = useColors();
  const listBottomPadding = useTabContentBottomPadding(100, 'automatic');
  const nativeTabs = usesNativeTabs();
  const {
    data: posts,
    isLoading,
    isFetching,
    refetch,
    isRefetching,
  } = useListPosts(undefined, {
    query: {
      ...PUBLIC_PRIVACY_QUERY_OPTIONS,
      queryKey: getListPostsQueryKey(),
    },
  });
  const visiblePosts = isFetching
    ? posts?.map(hideCachedPostFields)
    : posts;
  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return (
    <AppSafeAreaView
      testID="supporter-home-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Para Você</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Acompanhe e ore pelos missionários.
        </Text>
      </View>

      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior={nativeTabs ? 'automatic' : 'never'}
        contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => <PostCard post={item} isMissionary={false} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Seu feed está vazio. Descubra missionários para apoiar.
              </Text>
            </View>
          )
        }
      />
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  list: { padding: 16 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { textAlign: 'center', fontSize: 16, fontFamily: 'Inter_400Regular' },
});
