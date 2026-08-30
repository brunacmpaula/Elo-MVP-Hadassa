import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Missionary } from '@workspace/api-client-react';
import { useColors } from '../hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export function MissionaryCard({ missionary }: { missionary: Missionary }) {
  const colors = useColors();
  const router = useRouter();

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
          <View style={styles.location}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.country, { color: colors.mutedForeground }]}>
              {missionary.country}
            </Text>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
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
