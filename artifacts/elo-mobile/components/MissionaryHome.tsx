import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useListPosts } from '@workspace/api-client-react';
import { useColors } from '../hooks/useColors';
import { useSync } from '../context/SyncContext';
import { PostCard } from './PostCard';
import {
  AppSafeAreaView,
  useTabContentBottomPadding,
  usesNativeTabs,
} from './AppSafeAreaView';
import { Button } from './Button';
import { useOfflineMode } from '../context/OfflineContext';
import { Feather } from '@expo/vector-icons';
import { ComposePostModal } from './ComposePostModal';
import { formatPendingBytes } from '../context/syncState';

export function MissionaryHome() {
  const colors = useColors();
  const listBottomPadding = useTabContentBottomPadding();
  const nativeTabs = usesNativeTabs();
  const { data: serverPosts, isLoading, refetch } = useListPosts({ mine: true });
  const { localPosts, isSyncing, syncNow, queue, queueSummary, syncStatus } = useSync();
  const { isOfflineMode, isConnectionKnown } = useOfflineMode();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

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
    <AppSafeAreaView
      testID="missionary-home-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>Meu Diário</Text>
          <Button
            title="Novo"
            icon="plus"
            size="sm"
            onPress={() => setIsComposeOpen(true)}
            testID="open-compose-post"
          />
        </View>

        <View style={[styles.offlineBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.offlineLeft}>
            <Feather
              name={
                !isConnectionKnown
                  ? 'loader'
                  : isOfflineMode
                    ? 'wifi-off'
                    : isSyncing
                      ? 'refresh-cw'
                      : 'wifi'
              }
              size={18}
              color={isOfflineMode ? colors.accent : colors.success}
            />
            <Text style={[styles.offlineText, { color: colors.foreground }]}>
              {syncStatus === 'CHECKING_CONNECTION'
                ? 'Verificando conexão'
                : syncStatus === 'OFFLINE'
                  ? 'Fila pausada: sem conexão'
                  : syncStatus === 'WIFI_REQUIRED'
                    ? 'Fila pausada: aguardando Wi‑Fi'
                    : syncStatus === 'SYNCING'
                      ? 'Sincronizando publicações e imagens'
                      : syncStatus === 'FAILED'
                        ? 'Falha no envio. Abra a fila para tentar novamente'
                        : queue.length
                          ? `${queueSummary.publicationCount} publicações · ${queueSummary.imageCount} imagens · ${formatPendingBytes(queueSummary.totalBytes)}`
                          : 'Conectado e sincronizado'}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={allPosts}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior={nativeTabs ? 'automatic' : 'never'}
        contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
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
      <ComposePostModal
        visible={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </AppSafeAreaView>
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
  list: { padding: 16 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { textAlign: 'center', fontSize: 16, fontFamily: 'Inter_400Regular' },
});
