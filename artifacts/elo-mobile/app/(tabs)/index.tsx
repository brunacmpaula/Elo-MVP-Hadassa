import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { MissionaryHome } from '../../components/MissionaryHome';
import { SupporterHome } from '../../components/SupporterHome';

export default function TabOneScreen() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <View style={styles.container}>
      {user.role === 'MISSIONARY' ? <MissionaryHome /> : <SupporterHome />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
