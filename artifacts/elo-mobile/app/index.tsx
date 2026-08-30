import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { useColors } from '../hooks/useColors';
import { AppSafeAreaView } from '../components/AppSafeAreaView';
import { Feather } from '@expo/vector-icons';
import { Redirect } from 'expo-router';

export default function LoginScreen() {
  const { user, loginAs, isLoading, isLoggingOut } = useAuth();
  const colors = useColors();

  if (isLoading || isLoggingOut) {
    return (
      <AppSafeAreaView
        testID="login-screen"
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.center}>
          <Feather name="loader" size={24} color={colors.primary} />
        </View>
      </AppSafeAreaView>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.brandHeader, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Elo</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>
            Mesmo longe, juntos na missão.
          </Text>
        </View>

        <View style={styles.actions}>
          <Text style={[styles.label, { color: colors.primary }]}>
            Como você deseja participar?
          </Text>

          <Button
            title="Apoiadora/Apoiador"
            accessibilityLabel="Entrar como apoiador"
            icon="heart"
            variant="primary"
            fullWidth
            onPress={() => loginAs('SUPPORTER')}
            testID="login-as-supporter"
            style={styles.actionButton}
          />

          <Button
            title="Sou Missionário"
            accessibilityLabel="Entrar como missionário"
            icon="send"
            variant="secondary"
            fullWidth
            onPress={() => loginAs('MISSIONARY')}
            testID="login-as-missionary"
            style={styles.actionButton}
          />
        </View>
      </View>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 32,
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  actions: {
    gap: 16,
  },
  actionButton: {
    borderRadius: 32,
    paddingVertical: 18,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
});
