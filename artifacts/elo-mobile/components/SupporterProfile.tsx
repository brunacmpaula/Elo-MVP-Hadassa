import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppSafeAreaView, useTabContentBottomPadding } from './AppSafeAreaView';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../hooks/useColors';
import { useRouter } from 'expo-router';

export function SupporterProfile() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout, isLoggingOut } = useAuth();
  const [logoutError, setLogoutError] = React.useState<string | null>(null);
  const bottomPadding = useTabContentBottomPadding(90);
  if (!user) return null;

  const handleLogout = () => {
    setLogoutError(null);
    logout().catch(() => {
      setLogoutError(
        'Não foi possível sair agora. Verifique sua conexão e tente novamente.',
      );
    });
  };

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <AppSafeAreaView
      testID="supporter-profile-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Meu Perfil</Text>
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.cardForeground }]}>{user.name}</Text>
          <View style={[styles.role, { backgroundColor: colors.secondary }]}>
            <Feather name="heart" size={15} color={colors.accent} />
            <Text style={[styles.roleText, { color: colors.accent }]}>Apoiador</Text>
          </View>
          <Text style={[styles.email, { color: colors.cardForeground }]}>{user.email}</Text>
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Missionários salvos e comentários ficam vinculados somente a esta conta.
        </Text>
        <Button
          title="Sair da conta"
          icon="log-out"
          variant="outline"
          fullWidth
          onPress={handleLogout}
          loading={isLoggingOut}
          accessibilityLabel="Sair da conta"
          testID="supporter-logout"
        />
        {logoutError && (
          <Text
            style={[styles.logoutError, { color: colors.accent }]}
            accessibilityRole="alert"
          >
            {logoutError}
          </Text>
        )}
      </ScrollView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  content: { padding: 24, gap: 24 },
  card: { alignItems: 'center', borderRadius: 32, padding: 32, gap: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 32, fontFamily: 'Inter_700Bold' },
  name: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  role: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  roleText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  email: { fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 4 },
  hint: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  logoutError: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});