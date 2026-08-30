import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGetPost, usePrayForPost, useRemovePrayer, getGetPostQueryKey } from '@workspace/api-client-react';
import { useColors } from '../../hooks/useColors';
import { formatTimeAgo, translatePostType } from '../../lib/utils';
import { Button } from '../../components/Button';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const queryClient = useQueryClient();
  
  const { data: post, isLoading } = useGetPost(id!);
  const prayMutation = usePrayForPost();
  const removePrayerMutation = useRemovePrayer();

  const handlePray = () => {
    if (!post) return;
    
    // Optimistic update
    queryClient.setQueryData(getGetPostQueryKey(post.id), (old: any) => 
      old ? { ...old, prayedByMe: !old.prayedByMe, prayerCount: old.prayedByMe ? old.prayerCount - 1 : old.prayerCount + 1 } : old
    );

    if (post.prayedByMe) {
      removePrayerMutation.mutate({ postId: post.id });
    } else {
      prayMutation.mutate({ postId: post.id });
    }
  };

  if (isLoading || !post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
              {post.missionaryName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.authorName, { color: colors.foreground }]}>{post.missionaryName}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {translatePostType(post.type)} • {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
        </View>
        
        {post.status !== 'PUBLISHED' && (
          <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.statusText, { color: colors.warning }]}>Local</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>{post.title}</Text>
        <Text style={[styles.body, { color: colors.foreground }]}>{post.content}</Text>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.stats}>
          <Feather name="heart" size={16} color={colors.mutedForeground} />
          <Text style={[styles.statsText, { color: colors.mutedForeground }]}>
            {post.prayerCount} orações
          </Text>
        </View>
        
        <Button
          title={post.prayedByMe ? 'Estou Orando' : 'Orar'}
          icon="heart"
          variant={post.prayedByMe ? 'wine' : 'secondary'}
          fullWidth
          onPress={handlePray}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  authorName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  content: { paddingHorizontal: 24, paddingBottom: 32 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 16 },
  body: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 26 },
  footer: { padding: 24, borderTopWidth: 1, gap: 16 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingBottom: 8 },
  statsText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
