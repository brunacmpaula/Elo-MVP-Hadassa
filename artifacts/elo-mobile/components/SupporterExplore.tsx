import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  getListMissionariesQueryKey,
  useListMissionaries,
} from '@workspace/api-client-react';
import { useFocusEffect } from 'expo-router';
import { useColors } from '../hooks/useColors';
import {
  getVisibleMissionaries,
  PUBLIC_PRIVACY_QUERY_OPTIONS,
} from '../lib/privacy';
import { filterMissionaries, normalizeSearchText } from '../lib/search';
import { MissionaryCard } from './MissionaryCard';
import {
  AppSafeAreaView,
  useAppSafeAreaInsets,
  useTabContentBottomPadding,
  usesNativeTabs,
} from './AppSafeAreaView';

type SupporterExploreProps = {
  embedded?: boolean;
};

export function SupporterExplore({ embedded = false }: SupporterExploreProps) {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = React.useState('');
  const nativeTabs = usesNativeTabs();
  const { bottom } = useAppSafeAreaInsets();
  const standaloneBottomPadding = useTabContentBottomPadding(100, 'automatic');
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
  const visibleMissionaries = getVisibleMissionaries(missionaries, isFetching);
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const filteredMissionaries = React.useMemo(
    () => filterMissionaries(visibleMissionaries ?? [], searchQuery),
    [searchQuery, visibleMissionaries],
  );

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const content = (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={0}
      style={styles.keyboardArea}
    >
      <View style={[styles.header, embedded && styles.embeddedHeader]}>
        <Text style={[styles.title, { color: colors.primary }]}>
          Descobrir
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Encontre missionários por nome ou região.
        </Text>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.cardInner,
              borderColor: colors.secondary,
            },
          ]}
        >
          <Feather name="search" size={20} color={colors.primary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar missionários"
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
              <Feather
                name="x-circle"
                size={19}
                color={colors.mutedForeground}
              />
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
          <Text style={[styles.emptyTitle, { color: colors.accent }]}>
            Não foi possível carregar os missionários.
          </Text>
        </View>
      ) : normalizedSearchQuery && filteredMissionaries.length === 0 ? (
        <View
          style={styles.center}
          testID="explore-no-results"
          accessibilityLiveRegion="polite"
        >
          <Feather name="search" size={28} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Nenhum missionário encontrado.
          </Text>
          <Text
            style={[
              styles.emptyDescription,
              { color: colors.mutedForeground },
            ]}
          >
            Tente buscar por outro nome ou região.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMissionaries}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior={
            !embedded && nativeTabs ? 'automatic' : 'never'
          }
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom: embedded
                ? bottom + 104
                : standaloneBottomPadding,
            },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <MissionaryCard missionary={item} />}
        />
      )}
    </KeyboardAvoidingView>
  );

  if (embedded) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
        testID="explore-screen"
      >
        {content}
      </View>
    );
  }

  return (
    <AppSafeAreaView
      testID="explore-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {content}
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  embeddedHeader: {
    paddingTop: 4,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  searchBox: {
    minHeight: 50,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 0,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  list: {
    paddingHorizontal: 18,
    gap: 16,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  emptyDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});