import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGetMissionary, useFollowMissionary, useUnfollowMissionary, getGetMissionaryQueryKey } from '@workspace/api-client-react';
import { useColors } from '../../hooks/useColors';
import { Button } from '../../components/Button';
import { PostCard } from '../../components/PostCard';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

export default function MissionaryProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetMissionary(id!);
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

  if (isLoading || !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
            {profile.initials}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{profile.name}</Text>
        <View style={styles.location}>
          <Feather name="map-pin" size={14} color={colors.mutedForeground} />
          <Text style={[styles.country, { color: colors.mutedForeground }]}>{profile.country}</Text>
        </View>
        
        <View style={styles.actions}>
          <Button
            title={profile.isFollowed ? 'Apoiando' : 'Apoiar em Oração'}
            icon={profile.isFollowed ? 'check' : 'heart'}
            variant={profile.isFollowed ? 'secondary' : 'primary'}
            onPress={handleFollow}
          />
        </View>

        <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text>
      </View>

      <View style={styles.posts}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Diário do Campo</Text>
        {profile.posts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhuma publicação ainda.
          </Text>
        ) : (
          profile.posts.map((post) => (
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
