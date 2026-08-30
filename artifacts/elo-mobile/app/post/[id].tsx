import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  useCreatePostComment,
  useCreateContributionAvailability,
  useGetPost,
  useListPostComments,
  usePrayForPost,
  useRemoveContributionAvailability,
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
import { useOfflineMode } from '../../context/OfflineContext';
import { useSync } from '../../context/SyncContext';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { bottom } = useAppSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const { isOfflineMode } = useOfflineMode();
  const {
    localPosts,
    reconciledPostIds,
    syncStatus,
    isSyncStateLoaded,
  } = useSync();
  const [comment, setComment] = React.useState('');
  const [commentError, setCommentError] = React.useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = React.useState<string | null>(null);
  const isLocalPostId = Boolean(id?.startsWith('local_'));
  const localPost = isLocalPostId
    ? localPosts.find((candidate) => candidate.id === id)
    : undefined;

  const { data: post, isLoading, isFetching, refetch } = useGetPost(id ?? '', {
    query: {
      ...PUBLIC_PRIVACY_QUERY_OPTIONS,
      queryKey: getGetPostQueryKey(id ?? ''),
      enabled: Boolean(id) && !isLocalPostId,
    },
  });
  const visiblePost =
    localPost ?? (post && isFetching ? hideCachedPostFields(post) : post);

  React.useEffect(() => {
    if (!id || !isLocalPostId) return;
    const serverId = reconciledPostIds[id];
    if (serverId) {
      router.replace(`/post/${serverId}`);
    }
  }, [id, isLocalPostId, reconciledPostIds, router]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isLocalPostId) void refetch();
    }, [isLocalPostId, refetch]),
  );
  const prayMutation = usePrayForPost();
  const removePrayerMutation = useRemovePrayer();
  const commentsQuery = useListPostComments(id ?? '', {
    query: {
      queryKey: getListPostCommentsQueryKey(id ?? ''),
      enabled: Boolean(id) && !isLocalPostId,
    },
  });
  const commentMutation = useCreatePostComment();
  const createAvailabilityMutation = useCreateContributionAvailability();
  const removeAvailabilityMutation = useRemoveContributionAvailability();

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

  const handleContributionAvailability = () => {
    if (!post || post.type !== 'NEED') return;

    const queryKey = getGetPostQueryKey(post.id);
    const previousPost = queryClient.getQueryData(queryKey);
    const nextAvailable = !post.contributionAvailableByMe;
    setAvailabilityError(null);
    queryClient.setQueryData(queryKey, (old: any) =>
      old
        ? {
            ...old,
            contributionAvailableByMe: nextAvailable,
            contributionAvailabilityCount: Math.max(
              0,
              old.contributionAvailabilityCount + (nextAvailable ? 1 : -1),
            ),
          }
        : old,
    );

    const mutation = post.contributionAvailableByMe
      ? removeAvailabilityMutation
      : createAvailabilityMutation;
    mutation.mutate(
      { postId: post.id },
      {
        onSuccess: (state) => {
          queryClient.setQueryData(queryKey, (old: any) =>
            old
              ? {
                  ...old,
                  contributionAvailableByMe: state.availableByMe,
                  contributionAvailabilityCount: state.availabilityCount,
                }
              : old,
          );
        },
        onError: () => {
          queryClient.setQueryData(queryKey, previousPost);
          setAvailabilityError(
            isOfflineMode
              ? 'Você está sem conexão. Sua disponibilidade não foi alterada.'
              : 'Não foi possível atualizar sua disponibilidade. Verifique sua conexão e tente novamente.',
          );
        },
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({
            predicate: (query) =>
              String(query.queryKey[0]).startsWith('/api/missionaries/') ||
              String(query.queryKey[0]).includes('/contribution-availabilities'),
          });
        },
      },
    );
  };

  if (
    (!isLocalPostId && isLoading) ||
    (isLocalPostId && !isSyncStateLoaded)
  ) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!visiblePost) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.missingTitle, { color: colors.foreground }]}>
          Publicação local não encontrada
        </Text>
        <Text
          style={[styles.missingDescription, { color: colors.mutedForeground }]}
        >
          Volte ao Feed para verificar o estado da sincronização.
        </Text>
        <Button title="Voltar ao Feed" icon="arrow-left" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      testID="post-detail-screen"
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
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  (visiblePost.status === 'SYNC_FAILED'
                    ? colors.destructive
                    : colors.warning) + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    visiblePost.status === 'SYNC_FAILED'
                      ? colors.destructive
                      : colors.warning,
                },
              ]}
            >
              {visiblePost.status === 'SYNC_FAILED'
                ? 'Falha no envio'
                : syncStatus === 'OFFLINE'
                  ? 'Sem conexão'
                  : syncStatus === 'WIFI_REQUIRED'
                    ? 'Aguardando Wi‑Fi'
                    : 'Aguardando envio'}
            </Text>
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
        
        {!isLocalPostId && (
          <Button
            title={visiblePost.prayedByMe ? 'Estou Orando' : 'Orar'}
            icon="heart"
            variant={visiblePost.prayedByMe ? 'wine' : 'secondary'}
            fullWidth
            onPress={handlePray}
            testID="pray-for-post"
          />
        )}
        {user?.role === 'SUPPORTER' && visiblePost.type === 'NEED' && (
          <View style={styles.availability}>
            <Button
              title={
                visiblePost.contributionAvailableByMe
                  ? 'Disponibilidade registrada'
                  : 'Quero contribuir'
              }
              icon={visiblePost.contributionAvailableByMe ? 'check-circle' : 'gift'}
              variant={visiblePost.contributionAvailableByMe ? 'secondary' : 'outline'}
              fullWidth
              onPress={handleContributionAvailability}
              loading={
                createAvailabilityMutation.isPending ||
                removeAvailabilityMutation.isPending
              }
              accessibilityLabel={
                visiblePost.contributionAvailableByMe
                  ? 'Retirar minha disponibilidade'
                  : 'Quero contribuir'
              }
              testID="contribution-availability"
            />
            <Text style={[styles.availabilityStatus, { color: colors.mutedForeground }]}>
              {visiblePost.contributionAvailabilityCount === 0
                ? 'Seja a primeira pessoa a se disponibilizar.'
                : `${visiblePost.contributionAvailabilityCount} ${
                    visiblePost.contributionAvailabilityCount === 1
                      ? 'pessoa disponível'
                      : 'pessoas disponíveis'
                  }.`}
            </Text>
            <Text style={[styles.availabilityHint, { color: colors.mutedForeground }]}>
              Isso registra apenas seu interesse. Nenhum valor ou dado financeiro será solicitado.
            </Text>
            {availabilityError && (
              <Text
                style={[styles.availabilityError, { color: colors.destructive }]}
                accessibilityRole="alert"
              >
                {availabilityError}
              </Text>
            )}
          </View>
        )}
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
  missingTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  missingDescription: {
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
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
  availability: { alignItems: 'center', gap: 8 },
  availabilityStatus: { fontSize: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  availabilityHint: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  availabilityError: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium', textAlign: 'center' },
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
