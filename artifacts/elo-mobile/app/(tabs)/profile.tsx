import React from 'react';
import { Redirect } from 'expo-router';
import { MissionaryProfile } from '../../components/MissionaryProfile';
import { useAuth } from '../../context/AuthContext';
import { AppSafeAreaView } from '../../components/AppSafeAreaView';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { SupporterProfile } from '../../components/SupporterProfile';

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

  if (!user) return <Redirect href="/" />;

  return user.role === 'MISSIONARY' ? <MissionaryProfile /> : <SupporterProfile />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});