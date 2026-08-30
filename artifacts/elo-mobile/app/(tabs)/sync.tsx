import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSync } from '../../context/SyncContext';
import { useColors } from '../../hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { formatTimeAgo, translatePostType } from '../../lib/utils';

export default function SyncQueueScreen() {
  const { queue, syncNow, isSyncing } = useSync();
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Fila de Sincronização</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Operações aguardando conexão.
        </Text>
      </View>

      <View style={styles.listContainer}>
        {queue.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="check-circle" size={48} color={colors.success} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>Tudo sincronizado</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Não há itens aguardando envio.
            </Text>
          </View>
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemType, { color: colors.foreground }]}>
                    {item.type === 'CREATE_POST' ? 'Novo Post' : item.type}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'FAILED'
                            ? colors.destructive + '20'
                            : item.status === 'SYNCING'
                            ? colors.primary + '20'
                            : colors.muted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === 'FAILED'
                              ? colors.destructive
                              : item.status === 'SYNCING'
                              ? colors.primary
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {item.payload.title}
                </Text>
                {item.retryCount > 0 && (
                  <Text style={[styles.retryText, { color: colors.warning }]}>
                    Tentativas: {item.retryCount}
                  </Text>
                )}
              </View>
            )}
          />
        )}
      </View>
      
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button
          title={isSyncing ? 'Sincronizando...' : 'Tentar Novamente'}
          icon="refresh-cw"
          fullWidth
          onPress={syncNow}
          disabled={queue.length === 0 || isSyncing}
          loading={isSyncing}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  listContainer: { flex: 1 },
  list: { padding: 16, gap: 12 },
  item: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemType: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  itemTitle: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  retryText: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 20, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  emptySub: { fontSize: 16, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
});
