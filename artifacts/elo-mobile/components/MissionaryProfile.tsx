import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, type ProfileField } from '../context/AuthContext';
import { useColors } from '../hooks/useColors';
import { Button } from './Button';

type VisibilityRowProps = {
  field: ProfileField;
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
};

function VisibilityRow({
  field,
  label,
  value,
  icon,
}: VisibilityRowProps) {
  const colors = useColors();
  const { isFieldVisible, setFieldVisibility } = useAuth();
  const visible = isFieldVisible(field);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text
          style={[styles.rowValue, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {visible ? value : 'Oculto para outras pessoas'}
        </Text>
      </View>
      <Switch
        value={visible}
        onValueChange={(nextValue) => setFieldVisibility(field, nextValue)}
        trackColor={{ false: colors.border, true: colors.secondary }}
        thumbColor={visible ? colors.primary : colors.mutedForeground}
        accessibilityRole="switch"
        accessibilityLabel={`${visible ? 'Ocultar' : 'Exibir'} ${label}`}
        accessibilityState={{ checked: visible }}
      />
    </View>
  );
}

export function MissionaryProfile() {
  const colors = useColors();
  const {
    user,
    profilePreferences,
    setWomenOnlyNotifications,
    logout,
  } = useAuth();

  if (!user) return null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.accent }]}>
              MINHA CONTA
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Meu perfil
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
              {user.name
                .split(' ')
                .map((name) => name[0])
                .slice(0, 2)
                .join('')}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.identityCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user.name}
          </Text>
          <View style={styles.roleLine}>
            <Feather name="send" size={14} color={colors.primary} />
            <Text style={[styles.role, { color: colors.primary }]}>
              Missionária
            </Text>
          </View>
          <Text style={[styles.identityHint, { color: colors.mutedForeground }]}>
            Você decide quais dados ficam visíveis para quem acompanha sua missão.
          </Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Seus dados
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Ativado significa visível
          </Text>
        </View>

        <View
          style={[
            styles.settingsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <VisibilityRow
            field="email"
            label="E-mail"
            value={user.email}
            icon="mail"
          />
          <VisibilityRow
            field="location"
            label="Localização"
            value="Maputo, Moçambique"
            icon="map-pin"
          />
          <VisibilityRow
            field="bio"
            label="Sobre sua missão"
            value="Servindo famílias e formando lideranças locais."
            icon="heart"
          />
        </View>

        {user.gender === 'FEMALE' && (
          <>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Segurança e cuidado
              </Text>
            </View>
            <View
              style={[
                styles.notificationCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.notificationIcon, { backgroundColor: colors.accent + '16' }]}>
                <Feather name="heart" size={20} color={colors.accent} />
              </View>
              <View style={styles.notificationCopy}>
                <Text style={[styles.notificationTitle, { color: colors.foreground }]}>
                  Notificações entre mulheres
                </Text>
                <Text style={[styles.notificationDescription, { color: colors.mutedForeground }]}>
                  Ative para definir que as notificações desta missão sejam
                  direcionadas somente a outras mulheres.
                </Text>
              </View>
              <Switch
                value={profilePreferences.womenOnlyNotifications}
                onValueChange={setWomenOnlyNotifications}
                trackColor={{ false: colors.border, true: colors.accent + '65' }}
                thumbColor={
                  profilePreferences.womenOnlyNotifications
                    ? colors.accent
                    : colors.mutedForeground
                }
                accessibilityRole="switch"
                accessibilityLabel="Restringir notificações a outras mulheres"
                accessibilityState={{
                  checked: profilePreferences.womenOnlyNotifications,
                }}
              />
            </View>
          </>
        )}

        <Button
          title="Sair da conta"
          icon="log-out"
          variant="outline"
          fullWidth
          onPress={logout}
          accessibilityLabel="Sair da conta"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.6,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontFamily: 'Inter_700Bold',
  },
  identityCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  roleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  role: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  identityHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
    marginTop: 4,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  settingsCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  rowValue: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCopy: {
    flex: 1,
    gap: 5,
  },
  notificationTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  notificationDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
});