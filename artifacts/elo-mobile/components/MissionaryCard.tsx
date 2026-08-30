import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Missionary,
  useFollowMissionary,
  useUnfollowMissionary,
} from '@workspace/api-client-react';
import { useColors } from '../hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

export function MissionaryCard({ missionary }: { missionary: Missionary }) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const follow = useFollowMissionary();
  const unfollow = useUnfollowMissionary();
  const toggleSaved = () => {
    const action = missionary.isFollowed ? unfollow : follow;
    action.mutate(
      { missionaryId: missionary.id },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            predicate: (query) =>
              String(query.queryKey[0]).startsWith('/api/missionaries') ||
              String(query.queryKey[0]).startsWith('/api/posts'),
          }),
      },
    );
  };

  return (
    <Pressable
      onPress={() => router.push(`/missionary/${missionary.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>
            {missionary.initials}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{missionary.name}</Text>
          {missionary.country && (
            <View style={styles.location}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={[styles.country, { color: colors.mutedForeground }]}>
                {missionary.country}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          toggleSaved();
        }}
        accessibilityLabel={
          missionary.isFollowed ? 'Remover missionário dos salvos' : 'Salvar missionário'
        }
        hitSlop={10}
      >
        <Feather
          name={missionary.isFollowed ? 'bookmark' : 'bookmark'}
          size={22}
          color={missionary.isFollowed ? colors.accent : colors.mutedForeground}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  info: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  country: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
