import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Post } from '@workspace/api-client-react';
import { useColors } from '../hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { formatTimeAgo, translatePostType } from '../lib/utils';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface PostCardProps {
  post: Post;
  isMissionary?: boolean;
}

export function PostCard({ post, isMissionary }: PostCardProps) {
  const colors = useColors();
  const router = useRouter();

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
            {!isMissionary && <Text style={[styles.authorName, { color: colors.foreground }]}>{post.missionaryName}</Text>}
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {translatePostType(post.type)} • {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
        </View>
        
        {isMissionary && post.status !== 'PUBLISHED' && (
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
