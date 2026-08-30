import React from 'react';
import { Redirect } from 'expo-router';
import { MissionaryProfile } from '../../components/MissionaryProfile';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user?.role !== 'MISSIONARY') {
    return <Redirect href="/(tabs)" />;
  }

  return <MissionaryProfile />;
}