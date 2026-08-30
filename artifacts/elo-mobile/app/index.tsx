import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { useColors } from '../hooks/useColors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Redirect } from 'expo-router';

export default function LoginScreen() {
  const { user, loginAs, isLoading } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="loader" size={24} color={colors.primary} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Feather name="globe" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Elo</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Mesmo longe, juntos na missão.
          </Text>
        </View>

        <View style={styles.actions}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Como você deseja entrar nesta demonstração?
          </Text>
          
          <Button
            title="Sou Missionário"
            icon="send"
            fullWidth
            onPress={() => loginAs('MISSIONARY')}
          />
          
          <Button
            title="Sou Intercessor"
            icon="heart"
            variant="outline"
            fullWidth
            onPress={() => loginAs('SUPPORTER')}
          />
        </View>
      </View>
    </SafeAreaView>
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
  brand: {
    alignItems: 'center',
    marginBottom: 64,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  actions: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: 8,
  },
});
