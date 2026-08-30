import React from 'react';
import { Redirect } from 'expo-router';
import { MissionaryProfile } from '../../components/MissionaryProfile';
import { useAuth } from '../../context/AuthContext';
import { AppSafeAreaView } from '../../components/AppSafeAreaView';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';

export default function ProfileScreen() {
  const { user, isLoading } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return (
      <AppSafeAreaView style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </AppSafeAreaView>
    );
  }

  if (user?.role !== 'MISSIONARY') {
    return <Redirect href="/(tabs)" />;
  }

  return <MissionaryProfile />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});