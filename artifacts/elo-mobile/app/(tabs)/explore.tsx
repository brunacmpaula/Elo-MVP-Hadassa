import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  AppSafeAreaView,
  useTabContentBottomPadding,
  usesNativeTabs,
} from '../../components/AppSafeAreaView';
import {
  getListMissionariesQueryKey,
  useListMissionaries,
} from '@workspace/api-client-react';
import { useColors } from '../../hooks/useColors';
import { MissionaryCard } from '../../components/MissionaryCard';
import { FlatList } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
import {
  hideCachedMissionaryFields,
  PUBLIC_PRIVACY_QUERY_OPTIONS,
} from '../../lib/privacy';

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function ExploreScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const listBottomPadding = useTabContentBottomPadding(100, 'automatic');
  const nativeTabs = usesNativeTabs();
  const {
    data: missionaries,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useListMissionaries({
    query: {
      ...PUBLIC_PRIVACY_QUERY_OPTIONS,
      queryKey: getListMissionariesQueryKey(),
    },
  });
  const visibleMissionaries = isFetching
    ? missionaries?.map(hideCachedMissionaryFields)
    : missionaries;
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const filteredMissionaries = React.useMemo(() => {
    const availableMissionaries = visibleMissionaries ?? [];

    if (!normalizedSearchQuery) {
      return availableMissionaries;
    }

    return availableMissionaries.filter((missionary) =>
      [missionary.name, missionary.country].some(
        (field) => field && normalizeSearchText(field).includes(normalizedSearchQuery),
      ),
    );
  }, [normalizedSearchQuery, visibleMissionaries]);

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return (
    <AppSafeAreaView
      testID="explore-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={0}
        style={styles.keyboardArea}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Descobrir</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Encontre missionários para apoiar.
          </Text>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={19} color={colors.mutedForeground} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por nome ou região"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.foreground }]}
              accessibilityLabel="Buscar missionários por nome ou região"
              accessibilityHint="Digite um nome ou uma região para filtrar a lista"
              testID="explore-search-input"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
                hitSlop={10}
                testID="explore-search-clear"
              >
                <Feather name="x-circle" size={19} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ color: colors.destructive }}>Erro ao carregar missionários.</Text>
          </View>
        ) : normalizedSearchQuery && filteredMissionaries.length === 0 ? (
          <View
            style={styles.center}
            testID="explore-no-results"
            accessibilityLiveRegion="polite"
          >
            <Feather name="search" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nenhum missionário encontrado.
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
              Tente buscar por outro nome ou região.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredMissionaries}
            keyExtractor={(item) => item.id}
            contentInsetAdjustmentBehavior={nativeTabs ? 'automatic' : 'never'}
            contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <MissionaryCard missionary={item} />}
          />
        )}
      </KeyboardAvoidingView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  searchBox: {
    minHeight: 48,
    marginTop: 20,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 0,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  list: { padding: 16, gap: 16 },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyDescription: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
