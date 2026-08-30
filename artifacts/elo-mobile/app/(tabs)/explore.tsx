import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import {
  AppSafeAreaView,
  useTabContentBottomPadding,
  usesNativeTabs,
} from '../../components/AppSafeAreaView';
import {
  getListMissionariesQueryKey,
  useListMissionaries,
} from '@workspace/api-client-react';
import { useColors } from '../../hooks/useColors';
import { MissionaryCard } from '../../components/MissionaryCard';
import { FlatList } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
import {
  hideCachedMissionaryFields,
  PUBLIC_PRIVACY_QUERY_OPTIONS,
} from '../../lib/privacy';

export default function ExploreScreen() {
  const colors = useColors();
  const listBottomPadding = useTabContentBottomPadding();
  const nativeTabs = usesNativeTabs();
  const {
    data: missionaries,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useListMissionaries({
    query: {
      ...PUBLIC_PRIVACY_QUERY_OPTIONS,
      queryKey: getListMissionariesQueryKey(),
    },
  });
  const visibleMissionaries = isFetching
    ? missionaries?.map(hideCachedMissionaryFields)
    : missionaries;
  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return (
    <AppSafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Descobrir</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Encontre missionários para apoiar.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive }}>Erro ao carregar missionários.</Text>
        </View>
      ) : (
        <FlatList
          data={visibleMissionaries}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior={nativeTabs ? 'automatic' : 'never'}
          contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
          renderItem={({ item }) => <MissionaryCard missionary={item} />}
        />
      )}
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  list: { padding: 16, gap: 16 },
});
