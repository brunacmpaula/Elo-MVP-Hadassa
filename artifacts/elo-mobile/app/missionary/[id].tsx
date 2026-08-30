import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useGetMissionary, useFollowMissionary, useUnfollowMissionary, getGetMissionaryQueryKey } from '@workspace/api-client-react';
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

export default function MissionaryProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { bottom } = useAppSafeAreaInsets();
  const queryClient = useQueryClient();

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
  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const followMutation = useFollowMissionary();
  const unfollowMutation = useUnfollowMissionary();

  const handleFollow = () => {
    if (!profile) return;

    queryClient.setQueryData(getGetMissionaryQueryKey(profile.id), (old: any) => 
      old ? { ...old, isFollowed: !old.isFollowed } : old
    );

    if (profile.isFollowed) {
      unfollowMutation.mutate({ missionaryId: profile.id });
    } else {
      followMutation.mutate({ missionaryId: profile.id });
    }
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
          <Button
            title={visibleProfile.isFollowed ? 'Apoiando' : 'Apoiar em Oração'}
            icon={visibleProfile.isFollowed ? 'check' : 'heart'}
            variant={visibleProfile.isFollowed ? 'secondary' : 'primary'}
            onPress={handleFollow}
          />
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
  actions: { marginBottom: 24 },
  bio: { fontSize: 16, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 },
  posts: { padding: 16 },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 16, paddingHorizontal: 8 },
  emptyText: { textAlign: 'center', marginTop: 32, fontSize: 16, fontFamily: 'Inter_400Regular' },
});
