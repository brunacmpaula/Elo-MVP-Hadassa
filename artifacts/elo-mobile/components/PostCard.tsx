import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import {
  getGetPostQueryKey,
  getListPostsQueryKey,
  type Post,
  type PrayerState,
  usePrayForPost,
  useRemovePrayer,
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
}

export function PostCard({ post, isMissionary }: PostCardProps) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const prayMutation = usePrayForPost();
  const removePrayerMutation = useRemovePrayer();
  const [prayerError, setPrayerError] = React.useState<string | null>(null);
  const isPrayerSaving =
    prayMutation.isPending || removePrayerMutation.isPending;

  const handlePress = () => {
    router.push(`/post/${post.id}`);
  };

  const updatePrayerCaches = (state: PrayerState) => {
    const applyState = (current: Post): Post =>
      current.id === state.postId
        ? {
            ...current,
            prayedByMe: state.prayedByMe,
            prayerCount: state.prayerCount,
          }
        : current;

    queryClient.setQueriesData<Post[]>(
      { queryKey: getListPostsQueryKey() },
      (current) => current?.map(applyState),
    );
    queryClient.setQueryData<Post>(
      getGetPostQueryKey(state.postId),
      (current) => (current ? applyState(current) : current),
    );
  };

  const handlePray = () => {
    if (isPrayerSaving) return;
    setPrayerError(null);

    const previous: PrayerState = {
      postId: post.id,
      prayedByMe: post.prayedByMe,
      prayerCount: post.prayerCount,
    };
    const optimistic: PrayerState = {
      postId: post.id,
      prayedByMe: !post.prayedByMe,
      prayerCount: Math.max(
        0,
        post.prayerCount + (post.prayedByMe ? -1 : 1),
      ),
    };
    updatePrayerCaches(optimistic);

    const mutation = post.prayedByMe
      ? removePrayerMutation
      : prayMutation;
    mutation.mutate(
      { postId: post.id },
      {
        onSuccess: updatePrayerCaches,
        onError: () => {
          updatePrayerCaches(previous);
          setPrayerError('Não foi possível atualizar a oração.');
        },
        onSettled: () => {
          void queryClient.invalidateQueries({
            queryKey: getListPostsQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetPostQueryKey(post.id),
          });
        },
      },
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  // The Supporter specific view matching the exact reference
  if (!isMissionary) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.supporterCard,
          {
            backgroundColor: colors.card,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Abrir pedido de oração de ${post.missionaryName}`}
      >
        <View style={[styles.usernamePill, { backgroundColor: colors.cardInner }]}>
          <Text style={[styles.usernameText, { color: colors.accent }]}>@{post.missionaryName.toLowerCase().replace(/\s+/g, '.')}</Text>
        </View>

        <View style={[styles.supporterInner, { backgroundColor: colors.cardInner }]}>
          <Text
            style={[styles.supporterContent, { color: colors.primary }]}
            numberOfLines={6}
          >
            {post.content}
          </Text>

          <View style={styles.supporterFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                post.prayedByMe
                  ? 'Remover compromisso de oração'
                  : 'Marcar que estou orando'
              }
              accessibilityState={{
                selected: post.prayedByMe,
                disabled: isPrayerSaving,
              }}
              disabled={isPrayerSaving}
              onPress={(event) => {
                event.stopPropagation();
                handlePray();
              }}
              style={({ pressed }) => [
                styles.prayButton,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed || isPrayerSaving ? 0.76 : 1,
                },
              ]}
              testID={`pray-for-post-${post.id}`}
            >
              <Text
                style={[
                  styles.prayButtonText,
                  { color: colors.accentForeground },
                ]}
              >
                {post.prayedByMe ? 'Orando' : 'Oração'}
              </Text>
            </Pressable>
          </View>
          {prayerError && (
            <Text
              style={[styles.prayerError, { color: colors.accent }]}
              accessibilityRole="alert"
            >
              {prayerError}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }

  // Missionary legacy view
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardInner,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <View>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {translatePostType(post.type)} • {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
        </View>

        {post.status !== 'PUBLISHED' && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Feather name={getStatusIcon()} size={12} color={getStatusColor()} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {post.status === 'PENDING_SYNC' ? 'Aguardando' : 'Falhou'}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {post.title}
      </Text>
      
      <Text style={[styles.content, { color: colors.mutedForeground }]} numberOfLines={3}>
        {post.content}
      </Text>

      {post.media.length > 0 && (
        <View style={styles.mediaRow}>
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
          <Feather
            name={post.prayedByMe ? 'heart' : 'heart'}
            size={18}
            color={colors.accent}
          />
          <Text
            style={[
              styles.actionText,
              { color: colors.accent },
            ]}
          >
            {post.prayerCount} {post.prayerCount === 1 ? 'oração' : 'orações'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  supporterCard: {
    borderRadius: 34,
    padding: 12,
  },
  usernamePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 13,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
    marginBottom: 9,
  },
  usernameText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  supporterInner: {
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  supporterContent: {
    fontSize: 17,
    fontFamily: 'Inter_400Regular',
    lineHeight: 23,
    marginBottom: 8,
  },
  supporterFooter: {
    alignItems: 'flex-end',
  },
  prayButton: {
    minWidth: 98,
    minHeight: 38,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  prayerError: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
    fontFamily: 'Inter_500Medium',
  },

  // Missionary styles
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
