import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import {
  Post,
  useFollowMissionary,
  useUnfollowMissionary,
} from '@workspace/api-client-react';
import { useColors } from '../hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { formatTimeAgo, translatePostType } from '../lib/utils';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

interface PostCardProps {
  post: Post;
  isMissionary?: boolean;
  syncMessage?: string;
}

export function PostCard({ post, isMissionary, syncMessage }: PostCardProps) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const follow = useFollowMissionary();
  const unfollow = useUnfollowMissionary();
  const toggleSaved = () => {
    const mutation = post.missionarySaved ? unfollow : follow;
    mutation.mutate(
      { missionaryId: post.missionaryId },
      {
        onSettled: () =>
          queryClient.invalidateQueries({
            predicate: (query) =>
              String(query.queryKey[0]).startsWith('/api/missionaries') ||
              String(query.queryKey[0]).startsWith('/api/posts'),
          }),
      },
    );
  };

  const handlePress = () => {
    router.push(`/post/${post.id}`);
  };

  const getStatusColor = () => {
    if (post.status === 'PENDING_SYNC') return colors.warning;
    if (post.status === 'SYNC_FAILED') return colors.destructive;
    return colors.success;
  };

  const getStatusIcon = () => {
    if (post.status === 'PENDING_SYNC') return 'clock';
    if (post.status === 'SYNC_FAILED') return 'alert-circle';
    return 'check-circle';
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          {!isMissionary && (
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
                {post.missionaryName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            {!isMissionary && (
              <Text style={[styles.authorName, { color: colors.foreground }]}>
                {post.missionaryName}
              </Text>
            )}
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {translatePostType(post.type)} • {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
        </View>

        {isMissionary && post.status !== 'PUBLISHED' && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Feather name={getStatusIcon()} size={12} color={getStatusColor()} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {post.status === 'PENDING_SYNC' ? 'Aguardando envio' : 'Falha no envio'}
            </Text>
          </View>
        )}
        {!isMissionary && (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              toggleSaved();
            }}
            accessibilityLabel={
              post.missionarySaved
                ? 'Remover missionário dos salvos'
                : 'Salvar missionário'
            }
            hitSlop={10}
          >
            <Feather
              name="bookmark"
              size={21}
              color={post.missionarySaved ? colors.accent : colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={[styles.content, { color: colors.mutedForeground }]} numberOfLines={3}>
        {post.content}
      </Text>
      {isMissionary && syncMessage && (
        <Text
          style={[styles.syncMessage, { color: getStatusColor() }]}
          accessibilityLiveRegion="polite"
          testID={`post-sync-message-${post.id}`}
        >
          {syncMessage}
        </Text>
      )}

      {post.type === 'UPDATE' && post.media.length > 0 && (
        <View
          style={styles.mediaRow}
          testID="post-media"
          accessibilityLabel={`${post.media.length === 1 ? '1 imagem' : `${post.media.length} imagens`} da publicação`}
        >
          {post.media.slice(0, 3).map((item) => (
            <Image
              key={item.id}
              source={{ uri: item.thumbnailUri }}
              style={styles.mediaImage}
              accessibilityLabel="Imagem da publicação"
            />
          ))}
        </View>
      )}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.action}>
          <Feather name="heart" size={18} color={colors.accent} />
          <Text style={[styles.actionText, { color: colors.accent }]}>
            {post.prayerCount} {post.prayerCount === 1 ? 'oração' : 'orações'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  authorName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  meta: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  content: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 16,
  },
  syncMessage: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 19,
    marginTop: -8,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  mediaImage: {
    flex: 1,
    height: 110,
    borderRadius: 12,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});