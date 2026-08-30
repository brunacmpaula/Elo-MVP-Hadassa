import React from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import {
  getListPostsQueryKey,
  useListPosts,
} from '@workspace/api-client-react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../hooks/useColors';
import {
  hideCachedPostFields,
  PUBLIC_PRIVACY_QUERY_OPTIONS,
} from '../lib/privacy';
import {
  AppSafeAreaView,
  useAppSafeAreaInsets,
} from './AppSafeAreaView';
import { PostCard } from './PostCard';
import { SupporterExplore } from './SupporterExplore';

type MainSection = 'search' | 'prayer' | 'health' | 'food';
type FutureSection = 'women' | 'bible' | null;

type NavigationItem = {
  id: MainSection;
  label: string;
  icon: 'search' | 'praying-hands' | 'plus' | 'utensils';
  library: 'feather' | 'font-awesome';
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'search', label: 'Descobrir', icon: 'search', library: 'feather' },
  { id: 'prayer', label: 'Oração', icon: 'praying-hands', library: 'font-awesome' },
  { id: 'health', label: 'Saúde e ajuda', icon: 'plus', library: 'font-awesome' },
  { id: 'food', label: 'Alimentação', icon: 'utensils', library: 'font-awesome' },
];

export function SupporterHome() {
  const colors = useColors();
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { bottom } = useAppSafeAreaInsets();
  const [activeSection, setActiveSection] =
    React.useState<MainSection>('prayer');
  const [futureSection, setFutureSection] =
    React.useState<FutureSection>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const indicatorPosition = React.useRef(new Animated.Value(1)).current;
  const menuProgress = React.useRef(new Animated.Value(0)).current;

  const {
    data: posts,
    isLoading,
    isFetching,
    refetch,
    isRefetching,
  } = useListPosts(undefined, {
    query: {
      ...PUBLIC_PRIVACY_QUERY_OPTIONS,
      queryKey: getListPostsQueryKey(),
    },
  });
  const visiblePosts = isFetching ? posts?.map(hideCachedPostFields) : posts;
  const horizontalInset = 12;
  const tabWidth = (width - horizontalInset * 2) / NAVIGATION_ITEMS.length;
  const indicatorWidth = Math.min(tabWidth * 0.72, 78);
  const indicatorOffset = (tabWidth - indicatorWidth) / 2;
  const menuBottom = bottom + 20;
  const supporterName = user?.name ?? 'Esther';
  const supporterInitial = supporterName.charAt(0).toUpperCase();
  const welcomeMessage = supporterName.trim().endsWith('a')
    ? 'Bem-vinda de volta!'
    : 'Bem-vindo de volta!';

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const selectSection = (section: MainSection, index: number) => {
    setFutureSection(null);
    setActiveSection(section);
    Animated.spring(indicatorPosition, {
      toValue: index,
      useNativeDriver: true,
      tension: 75,
      friction: 10,
    }).start();
  };

  const toggleMenu = () => {
    const nextOpen = !isMenuOpen;
    setIsMenuOpen(nextOpen);
    Animated.timing(menuProgress, {
      toValue: nextOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const openFutureSection = (section: Exclude<FutureSection, null>) => {
    setFutureSection(section);
    setIsMenuOpen(false);
    Animated.timing(menuProgress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const renderMainContent = () => {
    if (futureSection) {
      const isWomen = futureSection === 'women';
      return (
        <View style={styles.emptyState}>
          <FontAwesome5
            name={isWomen ? 'female' : 'seedling'}
            size={34}
            color={colors.primary}
          />
          <Text style={[styles.emptyTitle, { color: colors.primary }]}>
            {isWomen ? 'Comunidade de mulheres' : 'Bíblia'}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
            Esta área está sendo preparada com carinho.
          </Text>
        </View>
      );
    }

    if (activeSection === 'search') {
      return <SupporterExplore embedded />;
    }

    if (activeSection === 'health' || activeSection === 'food') {
      const isHealth = activeSection === 'health';
      return (
        <View style={styles.emptyState}>
          <FontAwesome5
            name={isHealth ? 'plus' : 'utensils'}
            size={32}
            color={colors.primary}
          />
          <Text style={[styles.emptyTitle, { color: colors.primary }]}>
            {isHealth ? 'Saúde e ajuda' : 'Alimentação'}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
            Esta área estará disponível em breve.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.prayerSection}>
        <Text style={[styles.feedTitle, { color: colors.primary }]}>
          A quem posso abençoar{'\n'}hoje?
        </Text>
        <FlatList
          data={visiblePosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.prayerList,
            { paddingBottom: menuBottom + 92 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <PostCard post={item} isMissionary={false} />
          )}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.loadingIndicator}
              />
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome5
                  name="praying-hands"
                  size={30}
                  color={colors.primary}
                />
                <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                  Nenhum pedido agora
                </Text>
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Novos pedidos de oração aparecerão aqui.
                </Text>
              </View>
            )
          }
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppSafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.safeArea}
        testID="supporter-prayer-screen"
      >
        <View style={styles.profileRegion}>
          <View
            style={[
              styles.headerShape,
              { backgroundColor: colors.secondary },
            ]}
          />
          <View style={styles.profileHeader}>
            <View style={styles.profileIdentity}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.cardInner,
                    borderColor: colors.card,
                  },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {supporterInitial}
                </Text>
              </View>
              <View>
                <Text style={[styles.supporterName, { color: colors.foreground }]}>
                  {supporterName}
                </Text>
                <Text style={[styles.welcomeText, { color: colors.foreground }]}>
                  {welcomeMessage}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir meu perfil"
              hitSlop={12}
              onPress={() => router.push('/profile')}
              style={styles.profileButton}
            >
              <Feather name="user" size={29} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.navigation, { paddingHorizontal: horizontalInset }]}>
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                width: indicatorWidth,
                left: horizontalInset + indicatorOffset,
                backgroundColor: colors.secondary,
                transform: [
                  {
                    translateX: indicatorPosition.interpolate({
                      inputRange: [0, 1, 2, 3],
                      outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3],
                    }),
                  },
                ],
              },
            ]}
          />
          {NAVIGATION_ITEMS.map((item, index) => {
            const selected = activeSection === item.id && !futureSection;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected }}
                onPress={() => selectSection(item.id, index)}
                style={[styles.navigationButton, { width: tabWidth }]}
              >
                {item.library === 'feather' ? (
                  <Feather
                    name="search"
                    size={30}
                    color={colors.primary}
                  />
                ) : (
                  <FontAwesome5
                    name={item.icon}
                    size={item.id === 'prayer' ? 27 : 29}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.content}>{renderMainContent()}</View>
      </AppSafeAreaView>

      <View style={[styles.floatingMenu, { bottom: menuBottom }]}>
        <Animated.View
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
          style={[
            styles.floatingOptions,
            {
              opacity: menuProgress,
              transform: [
                {
                  translateY: menuProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [38, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir comunidade de mulheres"
            onPress={() => openFutureSection('women')}
            style={[
              styles.floatingOption,
              { backgroundColor: colors.secondary },
            ]}
          >
            <FontAwesome5 name="female" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir área da Bíblia"
            onPress={() => openFutureSection('bible')}
            style={[
              styles.floatingOption,
              { backgroundColor: colors.secondary },
            ]}
          >
            <FontAwesome5 name="seedling" size={21} color={colors.primary} />
          </Pressable>
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isMenuOpen ? 'Fechar menu inicial' : 'Abrir menu inicial'}
          accessibilityState={{ expanded: isMenuOpen }}
          onPress={toggleMenu}
          style={[styles.homeButton, { backgroundColor: colors.secondary }]}
        >
          <FontAwesome5 name="home" size={25} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  profileRegion: {
    height: 98,
    position: 'relative',
  },
  headerShape: {
    ...StyleSheet.absoluteFillObject,
    right: '18%',
    borderBottomRightRadius: 58,
  },
  profileHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  supporterName: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'Inter_500Medium',
  },
  welcomeText: {
    marginTop: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  profileButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigation: {
    height: 76,
    flexDirection: 'row',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -34,
    height: 92,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  navigationButton: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
  prayerSection: {
    flex: 1,
  },
  feedTitle: {
    paddingHorizontal: 24,
    marginTop: 2,
    marginBottom: 20,
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
  prayerList: {
    paddingHorizontal: 18,
    gap: 20,
  },
  loadingIndicator: {
    marginTop: 36,
  },
  emptyState: {
    flex: 1,
    minHeight: 220,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 22,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  floatingMenu: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  floatingOptions: {
    gap: 10,
    marginBottom: 10,
  },
  floatingOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButton: {
    width: 70,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
});