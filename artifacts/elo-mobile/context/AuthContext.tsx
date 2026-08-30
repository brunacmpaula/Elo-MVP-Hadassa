import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMissionaryPreferences,
  login,
  setAuthTokenGetter,
  updateMissionaryPreferences,
  type ProfilePreferences as ApiProfilePreferences,
  type User,
  type UserRole,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { clearPersistedSession } from '../lib/authSession';

export type ProfileField = 'email' | 'location' | 'bio';
export type ProfilePreferences = ApiProfilePreferences;
export type DemoUser = User;

const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  hiddenFields: [],
  womenOnlyNotifications: false,
};

const USER_STORAGE_KEY = '@elo:user';
const TOKEN_STORAGE_KEY = '@elo:token';
const PROFILE_PREFERENCES_STORAGE_KEY = '@elo:profile-preferences';

setAuthTokenGetter(() => AsyncStorage.getItem(TOKEN_STORAGE_KEY));

type AuthContextType = {
  user: DemoUser | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  loginAs: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  profilePreferences: ProfilePreferences;
  isFieldVisible: (field: ProfileField) => boolean;
  refreshProfilePreferences: () => Promise<void>;
  setFieldVisibility: (field: ProfileField, visible: boolean) => Promise<void>;
  setWomenOnlyNotifications: (enabled: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profilePreferences, setProfilePreferences] =
    useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const queryClient = useQueryClient();
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  const cacheProfilePreferences = async (preferences: ProfilePreferences) => {
    setProfilePreferences(preferences);
    await AsyncStorage.setItem(
      PROFILE_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  };

  const loadRemoteProfilePreferences = async (currentUser: DemoUser) => {
    if (
      currentUser.role !== 'MISSIONARY' ||
      !currentUser.missionaryProfileId
    ) {
      setProfilePreferences(DEFAULT_PROFILE_PREFERENCES);
      return;
    }
    const preferences = await getMissionaryPreferences(
      currentUser.missionaryProfileId,
    );
    await cacheProfilePreferences(preferences);
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedUser, storedToken, storedPreferences] = await Promise.all([
          AsyncStorage.getItem(USER_STORAGE_KEY),
          AsyncStorage.getItem(TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(PROFILE_PREFERENCES_STORAGE_KEY),
        ]);

        if (!storedUser || !storedToken) return;
        const restoredUser = JSON.parse(storedUser) as DemoUser;
        setUser(restoredUser);
        if (storedPreferences) {
          setProfilePreferences(JSON.parse(storedPreferences));
        }

        try {
          await loadRemoteProfilePreferences(restoredUser);
        } catch {
          // The cache is only an offline display fallback. The next refresh
          // still asks the server, which remains the source of truth.
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const loginAs = async (role: UserRole) => {
    const session = await login({
      email: role === 'MISSIONARY' ? 'ana@elo.demo' : 'marina@elo.demo',
      password: 'demo',
    });

    await Promise.all([
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user)),
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, session.token),
    ]);
    setUser(session.user);
    await loadRemoteProfilePreferences(session.user);
  };

  const logout = () => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current;

    const logoutPromise = (async () => {
      setIsLoggingOut(true);
      try {
        // Keep the authenticated tree mounted until persistence is gone. This
        // prevents the tabs from rendering a user-less screen mid-transition.
        await clearPersistedSession(AsyncStorage);
        queryClient.clear();
        setUser(null);
        setProfilePreferences(DEFAULT_PROFILE_PREFERENCES);
        // Let the root navigator render its logout transition before the
        // authenticated tree is mounted again at the login route.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      } finally {
        setIsLoggingOut(false);
        logoutPromiseRef.current = null;
      }
    })();

    logoutPromiseRef.current = logoutPromise;
    return logoutPromise;
  };

  const refreshProfilePreferences = async () => {
    if (!user) return;
    await loadRemoteProfilePreferences(user);
  };

  const saveProfilePreferences = async (next: ProfilePreferences) => {
    if (
      !user ||
      user.role !== 'MISSIONARY' ||
      !user.missionaryProfileId
    ) {
      return;
    }
    const saved = await updateMissionaryPreferences(
      user.missionaryProfileId,
      next,
    );
    await cacheProfilePreferences(saved);
    await queryClient.invalidateQueries({
      predicate: (query) =>
        String(query.queryKey[0]).startsWith('/api/missionaries'),
    });
  };

  const setFieldVisibility = async (
    field: ProfileField,
    visible: boolean,
  ) => {
    const hiddenFields = visible
      ? profilePreferences.hiddenFields.filter((item) => item !== field)
      : Array.from(new Set([...profilePreferences.hiddenFields, field]));
    await saveProfilePreferences({ ...profilePreferences, hiddenFields });
  };

  const setWomenOnlyNotifications = async (enabled: boolean) => {
    await saveProfilePreferences({
      ...profilePreferences,
      womenOnlyNotifications: enabled,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggingOut,
        loginAs,
        logout,
        profilePreferences,
        isFieldVisible: (field) =>
          !profilePreferences.hiddenFields.includes(field),
        refreshProfilePreferences,
        setFieldVisibility,
        setWomenOnlyNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('Missing AuthProvider');
  return ctx;
};