import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  useCreatePostComment,
  useGetPost,
  useListPostComments,
  usePrayForPost,
  useRemovePrayer,
  getGetPostQueryKey,
  getListPostCommentsQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '../../hooks/useColors';
import { formatTimeAgo, translatePostType } from '../../lib/utils';
import { Button } from '../../components/Button';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSafeAreaInsets } from '../../components/AppSafeAreaView';
import {
  hideCachedPostFields,
  PUBLIC_PRIVACY_QUERY_OPTIONS,
} from '../../lib/privacy';
import { useAuth } from '../../context/AuthContext';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { bottom } = useAppSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [comment, setComment] = React.useState('');
  const [commentError, setCommentError] = React.useState<string | null>(null);
  
  const { data: post, isLoading, isFetching, refetch } = useGetPost(id!, {
    query: {
      ...PUBLIC_PRIVACY_QUERY_OPTIONS,
      queryKey: getGetPostQueryKey(id!),
    },
  });
  const visiblePost =
    post && isFetching ? hideCachedPostFields(post) : post;
  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const prayMutation = usePrayForPost();
  const removePrayerMutation = useRemovePrayer();
  const commentsQuery = useListPostComments(id!);
  const commentMutation = useCreatePostComment();

  const submitComment = () => {
    const content = comment.trim();
    if (!content || !id) return;
    setCommentError(null);
    const clientOperationId = `comment_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`;
    commentMutation.mutate(
      { postId: id, data: { content, clientOperationId } },
      {
        onSuccess: () => {
          setComment('');
          queryClient.invalidateQueries({
            queryKey: getListPostCommentsQueryKey(id),
          });
          queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(id) });
        },
        onError: () =>
          setCommentError('Não foi possível enviar. Verifique sua conexão e tente novamente.'),
      },
    );
  };

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

  if (isLoading || !visiblePost) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: bottom + 24 }}
    >
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
              {visiblePost.missionaryName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.authorName, { color: colors.foreground }]}>{visiblePost.missionaryName}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {translatePostType(visiblePost.type)} • {formatTimeAgo(visiblePost.createdAt)}
            </Text>
          </View>
        </View>
        
        {visiblePost.status !== 'PUBLISHED' && (
          <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.statusText, { color: colors.warning }]}>Local</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>{visiblePost.title}</Text>
        <Text style={[styles.body, { color: colors.foreground }]}>{visiblePost.content}</Text>
        {visiblePost.media.map((item) => (
          <Image
            key={item.id}
            source={{ uri: item.uri }}
            style={styles.postImage}
            resizeMode="cover"
            accessibilityLabel="Imagem da publicação"
          />
        ))}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.stats}>
          <Feather name="heart" size={16} color={colors.mutedForeground} />
          <Text style={[styles.statsText, { color: colors.mutedForeground }]}>
            {visiblePost.prayerCount} orações
          </Text>
        </View>
        
        <Button
          title={visiblePost.prayedByMe ? 'Estou Orando' : 'Orar'}
          icon="heart"
          variant={visiblePost.prayedByMe ? 'wine' : 'secondary'}
          fullWidth
          onPress={handlePray}
        />
      </View>

      <View style={[styles.comments, { borderTopColor: colors.border }]}>
        <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
          Comentários
        </Text>
        {(commentsQuery.data ?? visiblePost.comments).length === 0 ? (
          <Text style={[styles.emptyComments, { color: colors.mutedForeground }]}>
            Ainda não há comentários.
          </Text>
        ) : (
          (commentsQuery.data ?? visiblePost.comments).map((item) => (
            <View key={item.id} style={[styles.commentCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
                {item.authorName}
              </Text>
              <Text style={[styles.commentText, { color: colors.mutedForeground }]}>
                {item.content}
              </Text>
            </View>
          ))
        )}
        {user?.role === 'SUPPORTER' && (
          <View style={styles.commentComposer}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Escreva um comentário de apoio"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              style={[
                styles.commentInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              accessibilityLabel="Novo comentário"
              testID="comment-input"
            />
            {commentError && (
              <Text style={[styles.commentError, { color: colors.destructive }]} accessibilityRole="alert">
                {commentError}
              </Text>
            )}
            <Button
              title="Comentar"
              icon="send"
              onPress={submitComment}
              disabled={!comment.trim() || commentMutation.isPending}
              loading={commentMutation.isPending}
              testID="submit-comment"
            />
          </View>
        )}
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
  postImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, marginTop: 18 },
  footer: { padding: 24, borderTopWidth: 1, gap: 16 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingBottom: 8 },
  statsText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  comments: { padding: 24, borderTopWidth: 1, gap: 12 },
  commentsTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  emptyComments: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  commentCard: { borderRadius: 14, padding: 14, gap: 4 },
  commentAuthor: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  commentText: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  commentComposer: { gap: 10, marginTop: 6 },
  commentInput: { minHeight: 86, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: 'top' },
  commentError: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
});
