import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  useGetMissionary,
  useFollowMissionary,
  useListMissionaryContributionAvailabilities,
  useCreateContributionAvailabilityFeedback,
  useUnfollowMissionary,
  getGetMissionaryQueryKey,
  getListMissionaryContributionAvailabilitiesQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '../../hooks/useColors';
import { Button } from '../../components/Button';
import { PostCard } from '../../components/PostCard';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSafeAreaInsets } from '../../components/AppSafeAreaView';
import {
  hideCachedMissionaryProfileFields,
  PUBLIC_PRIVACY_QUERY_OPTIONS,
} from '../../lib/privacy';
import { useAuth } from '../../context/AuthContext';
import { useOfflineMode } from '../../context/OfflineContext';
import { formatTimeAgo } from '../../lib/utils';

export default function MissionaryProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { bottom } = useAppSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOfflineMode } = useOfflineMode();
  const [feedbackDrafts, setFeedbackDrafts] = React.useState<Record<string, string>>({});
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null);
  const [submittingAvailabilityId, setSubmittingAvailabilityId] = React.useState<string | null>(
    null,
  );
  const isOwner =
    user?.role === 'MISSIONARY' && user.missionaryProfileId === id;

  const { data: profile, isLoading, isFetching, refetch } = useGetMissionary(id!, {
    query: {
      ...PUBLIC_PRIVACY_QUERY_OPTIONS,
      queryKey: getGetMissionaryQueryKey(id!),
    },
  });
  const visibleProfile =
    profile && isFetching
      ? hideCachedMissionaryProfileFields(profile)
      : profile;
  const {
    data: contributionAvailabilities,
    isLoading: isLoadingAvailabilities,
    isError: isAvailabilityError,
    refetch: refetchAvailabilities,
  } = useListMissionaryContributionAvailabilities(id!, {
    query: {
      enabled: isOwner,
      queryKey: getListMissionaryContributionAvailabilitiesQueryKey(id!),
    },
  });
  useFocusEffect(
    React.useCallback(() => {
      void refetch();
      if (isOwner) void refetchAvailabilities();
    }, [isOwner, refetch, refetchAvailabilities]),
  );
  const followMutation = useFollowMissionary();
  const unfollowMutation = useUnfollowMissionary();
  const feedbackMutation = useCreateContributionAvailabilityFeedback();

  const handleFollow = () => {
    if (!profile) return;

    queryClient.setQueryData(getGetMissionaryQueryKey(profile.id), (old: any) => 
      old ? { ...old, isFollowed: !old.isFollowed } : old
    );

    const mutation = profile.isFollowed ? unfollowMutation : followMutation;
    mutation.mutate(
      { missionaryId: profile.id },
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

  const submitFeedback = (availabilityId: string, messageOverride?: string) => {
    if (!id) return;
    if (isOfflineMode) {
      setFeedbackError('Você está sem conexão. O retorno não foi enviado.');
      return;
    }
    const message = (messageOverride ?? feedbackDrafts[availabilityId] ?? '').trim();
    if (!message) {
      setFeedbackError('Escreva uma mensagem antes de enviar.');
      return;
    }
    setFeedbackError(null);
    setSubmittingAvailabilityId(availabilityId);
    feedbackMutation.mutate(
      { missionaryId: id, availabilityId, data: { message } },
      {
        onSuccess: () => {
          setFeedbackDrafts((current) => ({ ...current, [availabilityId]: '' }));
          void refetchAvailabilities();
        },
        onError: () => {
          setFeedbackError(
            isOfflineMode
              ? 'Você está sem conexão. O retorno não foi enviado.'
              : 'Não foi possível enviar o retorno. Verifique sua conexão e tente novamente.',
          );
        },
        onSettled: () => setSubmittingAvailabilityId(null),
      },
    );
  };

  if (isLoading || !visibleProfile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      testID="missionary-detail-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: bottom + 24 }}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
            {visibleProfile.initials}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{visibleProfile.name}</Text>
        {visibleProfile.country && (
          <View style={styles.location}>
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <Text style={[styles.country, { color: colors.mutedForeground }]}>{visibleProfile.country}</Text>
          </View>
        )}
        
        <View style={styles.actions}>
          {user?.role === 'SUPPORTER' && (
            <>
              <Button
                title={visibleProfile.isFollowed ? 'Salvo' : 'Salvar missionário'}
                icon={visibleProfile.isFollowed ? 'check' : 'bookmark'}
                variant={visibleProfile.isFollowed ? 'secondary' : 'primary'}
                onPress={handleFollow}
                testID="follow-missionary"
              />
            </>
          )}
        </View>

        {visibleProfile.bio && (
          <Text style={[styles.bio, { color: colors.foreground }]}>{visibleProfile.bio}</Text>
        )}
      </View>

      <View style={styles.posts}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Diário do Campo</Text>
        {visibleProfile.posts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhuma publicação ainda.
          </Text>
        ) : (
          visibleProfile.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </View>

      {isOwner && (
        <View style={styles.availabilities}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Disponibilidades para contribuir
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.mutedForeground }]}>
            Pessoas que registraram interesse nas suas Necessidades. Nenhum pagamento é iniciado por aqui.
          </Text>
          {isLoadingAvailabilities ? (
            <ActivityIndicator color={colors.primary} />
          ) : isAvailabilityError ? (
            <View style={styles.availabilityFeedback}>
              <Text
                style={[styles.availabilityError, { color: colors.destructive }]}
                accessibilityRole="alert"
              >
                Não foi possível carregar as disponibilidades. Verifique sua conexão.
              </Text>
              <Button
                title="Tentar novamente"
                icon="refresh-cw"
                variant="outline"
                size="sm"
                onPress={() => void refetchAvailabilities()}
                testID="retry-contribution-availabilities"
              />
            </View>
          ) : contributionAvailabilities?.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Ninguém se disponibilizou ainda.
            </Text>
          ) : (
            visibleProfile.posts
              .filter((post) => post.type === 'NEED')
              .map((post) => {
                const entries =
                  contributionAvailabilities?.filter(
                    (availability) => availability.postId === post.id,
                  ) ?? [];
                if (entries.length === 0) return null;
                return (
                  <View
                    key={post.id}
                    style={[
                      styles.availabilityCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    testID={`need-availabilities-${post.id}`}
                  >
                    <Text style={[styles.availabilityTitle, { color: colors.foreground }]}>
                      {post.title}
                    </Text>
                    <Text
                      style={[styles.availabilityCount, { color: colors.mutedForeground }]}
                    >
                      {entries.length}{' '}
                      {entries.length === 1
                        ? 'pessoa disponível'
                        : 'pessoas disponíveis'}
                    </Text>
                    {entries.map((availability) => {
                      const isSubmitting =
                        submittingAvailabilityId === availability.id &&
                        feedbackMutation.isPending;
                      return (
                        <View key={availability.id} style={styles.supporterEntry}>
                          <View style={styles.supporterRow}>
                            <Feather name="user" size={16} color={colors.primary} />
                            <Text
                              style={[styles.supporterName, { color: colors.foreground }]}
                            >
                              {availability.supporterName}
                            </Text>
                            <Text
                              style={[styles.supporterTime, { color: colors.mutedForeground }]}
                            >
                              {formatTimeAgo(availability.createdAt)}
                            </Text>
                          </View>
                          {availability.feedback && (
                            <View
                              style={[
                                styles.sentFeedback,
                                { backgroundColor: colors.secondary },
                              ]}
                            >
                              <Text style={[styles.sentFeedbackLabel, { color: colors.primary }]}>
                                Retorno enviado
                              </Text>
                              <Text style={[styles.sentFeedbackText, { color: colors.foreground }]}>
                                {availability.feedback.message}
                              </Text>
                            </View>
                          )}
                          <TextInput
                            value={feedbackDrafts[availability.id] ?? ''}
                            onChangeText={(value) =>
                              setFeedbackDrafts((current) => ({
                                ...current,
                                [availability.id]: value,
                              }))
                            }
                            placeholder={
                              availability.feedback
                                ? 'Escreva outro retorno (opcional)'
                                : 'Escreva um retorno curto (opcional)'
                            }
                            placeholderTextColor={colors.mutedForeground}
                            maxLength={280}
                            multiline
                            style={[
                              styles.feedbackInput,
                              {
                                color: colors.foreground,
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                              },
                            ]}
                            accessibilityLabel={`Retorno para ${availability.supporterName}`}
                            testID={`feedback-input-${availability.id}`}
                          />
                          <View style={styles.feedbackActions}>
                            <Button
                              title="Agradecer"
                              icon="heart"
                              variant="secondary"
                              size="sm"
                              disabled={isOfflineMode || isSubmitting}
                              loading={isSubmitting}
                              onPress={() =>
                                submitFeedback(
                                  availability.id,
                                  'Obrigado por se disponibilizar! Vamos seguir em contato por aqui.',
                                )
                              }
                              testID={`acknowledge-feedback-${availability.id}`}
                            />
                            <Button
                              title="Enviar retorno"
                              icon="send"
                              variant="outline"
                              size="sm"
                              disabled={
                                isOfflineMode ||
                                isSubmitting ||
                                !(feedbackDrafts[availability.id] ?? '').trim()
                              }
                              loading={isSubmitting}
                              onPress={() => submitFeedback(availability.id)}
                              testID={`send-feedback-${availability.id}`}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })
          )}
          {isOfflineMode && (
            <Text style={[styles.offlineHint, { color: colors.warning }]}>
              Você está sem conexão. Conecte-se para enviar um retorno.
            </Text>
          )}
          {feedbackError && (
            <Text
              style={[styles.availabilityError, { color: colors.destructive }]}
              accessibilityRole="alert"
            >
              {feedbackError}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontFamily: 'Inter_700Bold' },
  name: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  country: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  actions: { marginBottom: 24, flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  bio: { fontSize: 16, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 },
  posts: { padding: 16 },
  availabilities: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 16, paddingHorizontal: 8 },
  sectionDescription: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', paddingHorizontal: 8, marginTop: -10 },
  emptyText: { textAlign: 'center', marginTop: 32, fontSize: 16, fontFamily: 'Inter_400Regular' },
  availabilityFeedback: { alignItems: 'center', gap: 12 },
  availabilityError: { textAlign: 'center', fontSize: 14, lineHeight: 20, fontFamily: 'Inter_500Medium' },
  availabilityCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  availabilityTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  availabilityCount: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  supporterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  supporterEntry: { gap: 10, paddingTop: 4 },
  supporterName: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  supporterTime: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  sentFeedback: { borderRadius: 12, padding: 10, gap: 3 },
  sentFeedbackLabel: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  sentFeedbackText: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  feedbackInput: {
    minHeight: 58,
    maxHeight: 110,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    textAlignVertical: 'top',
    fontFamily: 'Inter_400Regular',
  },
  feedbackActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  offlineHint: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
});
