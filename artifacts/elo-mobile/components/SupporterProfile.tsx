import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppSafeAreaView, useTabContentBottomPadding } from './AppSafeAreaView';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../hooks/useColors';

export function SupporterProfile() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const bottomPadding = useTabContentBottomPadding(90);
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <AppSafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
        <Text style={[styles.kicker, { color: colors.accent }]}>MINHA CONTA</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Perfil do Apoiador</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{user.name}</Text>
          <View style={styles.role}>
            <Feather name="heart" size={15} color={colors.accent} />
            <Text style={[styles.roleText, { color: colors.accent }]}>Apoiador</Text>
          </View>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Missionários salvos e comentários ficam vinculados somente a esta conta.
        </Text>
        <Button title="Sair da conta" icon="log-out" variant="outline" fullWidth onPress={logout} />
      </ScrollView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 18 },
  kicker: { fontSize: 11, letterSpacing: 1.5, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold' },
  card: { alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 24, gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  name: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  role: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  email: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  hint: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
});