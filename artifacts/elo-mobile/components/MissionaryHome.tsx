import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Switch } from 'react-native';
import { useListPosts } from '@workspace/api-client-react';
import { useColors } from '../hooks/useColors';
import { useSync } from '../context/SyncContext';
import { PostCard } from './PostCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { useRouter } from 'expo-router';
import { useOfflineMode } from '../context/OfflineContext';
import { Feather } from '@expo/vector-icons';

export function MissionaryHome() {
  const colors = useColors();
  const { data: serverPosts, isLoading, refetch } = useListPosts({ mine: true });
  const { localPosts, isSyncing, syncNow } = useSync();
  const router = useRouter();
  const { isOfflineMode, toggleOfflineMode } = useOfflineMode();

  const allPosts = useMemo(() => {
    const remote = serverPosts || [];
    // We filter localPosts to those not yet synced (status !== PUBLISHED)
    // Actually, our local state replaces them with PUBLISHED. So we want a unified list.
    // Local list wins if it has same ID.
    const map = new Map();
    remote.forEach((p) => map.set(p.id, p));
    localPosts.forEach((p) => map.set(p.id, p));
    
    return Array.from(map.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [serverPosts, localPosts]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>Meu Diário</Text>
          <Button
            title="Novo"
            icon="plus"
            size="sm"
            onPress={() => router.push('/compose')}
          />
        </View>

        <View style={[styles.offlineBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.offlineLeft}>
            <Feather name={isOfflineMode ? 'wifi-off' : 'wifi'} size={18} color={isOfflineMode ? colors.destructive : colors.success} />
            <Text style={[styles.offlineText, { color: colors.foreground }]}>
              {isOfflineMode ? 'Modo Offline (Simulação)' : 'Conectado'}
            </Text>
          </View>
          <Switch 
            value={isOfflineMode}
            onValueChange={toggleOfflineMode}
            trackColor={{ true: colors.destructive, false: colors.muted }}
          />
        </View>
      </View>

      <FlatList
        data={allPosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading || isSyncing}
        onRefresh={() => {
          syncNow();
          refetch();
        }}
        renderItem={({ item }) => <PostCard post={item} isMissionary={true} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhuma publicação ainda. Compartilhe um pedido de oração!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  offlineBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  offlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offlineText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { textAlign: 'center', fontSize: 16, fontFamily: 'Inter_400Regular' },
});
