import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '@workspace/api-client-react';
import { useRouter } from 'expo-router';

export type ProfileField = 'email' | 'location' | 'bio';

export type ProfilePreferences = {
  hiddenFields: ProfileField[];
  womenOnlyNotifications: boolean;
};

export type DemoUser = User & {
  gender: 'FEMALE' | 'MALE';
};

const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  hiddenFields: [],
  womenOnlyNotifications: false,
};

const DEMO_MISSIONARY_USER_ID = 'user-ana';
const DEMO_MISSIONARY_PROFILE_ID = 'missionary-ana';

const profilePreferencesKey = (userId: string) =>
  `@elo:profile-preferences:${userId}`;

type AuthContextType = {
  user: DemoUser | null;
  isLoading: boolean;
  loginAs: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  profilePreferences: ProfilePreferences;
  isFieldVisible: (field: ProfileField) => boolean;
  isMissionaryFieldVisible: (
    missionaryId: string,
    field: ProfileField,
  ) => boolean;
  setFieldVisibility: (field: ProfileField, visible: boolean) => Promise<void>;
  setWomenOnlyNotifications: (enabled: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profilePreferences, setProfilePreferences] =
    useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [demoMissionaryPreferences, setDemoMissionaryPreferences] =
    useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedMissionaryPreferences = await AsyncStorage.getItem(
          profilePreferencesKey(DEMO_MISSIONARY_USER_ID),
        );
        if (storedMissionaryPreferences) {
          setDemoMissionaryPreferences(
            JSON.parse(storedMissionaryPreferences),
          );
        }

        const storedUser = await AsyncStorage.getItem('@elo:user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as User & {
            gender?: DemoUser['gender'];
          };
          const restoredUser: DemoUser = {
            ...parsedUser,
            gender: parsedUser.gender ?? 'MALE',
          };
          setUser(restoredUser);

          const storedPreferences = await AsyncStorage.getItem(
            profilePreferencesKey(restoredUser.id),
          );
          setProfilePreferences(
            storedPreferences
              ? JSON.parse(storedPreferences)
              : DEFAULT_PROFILE_PREFERENCES,
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const loginAs = async (role: UserRole) => {
    const mockUser: DemoUser = {
      id: role === 'MISSIONARY' ? DEMO_MISSIONARY_USER_ID : 's1',
      name: role === 'MISSIONARY' ? 'Ana Silva' : 'Maria Oliveira',
      email: 'test@elo.com',
      role,
      gender: role === 'MISSIONARY' ? 'FEMALE' : 'MALE',
    };
    const storedPreferences = await AsyncStorage.getItem(
      profilePreferencesKey(mockUser.id),
    );
    const nextPreferences = storedPreferences
      ? JSON.parse(storedPreferences)
      : DEFAULT_PROFILE_PREFERENCES;
    setUser(mockUser);
    setProfilePreferences(nextPreferences);
    if (mockUser.id === DEMO_MISSIONARY_USER_ID) {
      setDemoMissionaryPreferences(nextPreferences);
    }
    await AsyncStorage.setItem('@elo:user', JSON.stringify(mockUser));
    router.replace('/(tabs)');
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@elo:user');
    setProfilePreferences(DEFAULT_PROFILE_PREFERENCES);
    router.replace('/');
  };

  const saveProfilePreferences = async (next: ProfilePreferences) => {
    setProfilePreferences(next);
    if (user) {
      await AsyncStorage.setItem(
        profilePreferencesKey(user.id),
        JSON.stringify(next),
      );
      if (user.id === DEMO_MISSIONARY_USER_ID) {
        setDemoMissionaryPreferences(next);
      }
    }
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
        loginAs,
        logout,
        profilePreferences,
        isFieldVisible: (field) =>
          !profilePreferences.hiddenFields.includes(field),
        isMissionaryFieldVisible: (missionaryId, field) =>
          missionaryId !== DEMO_MISSIONARY_PROFILE_ID ||
          !demoMissionaryPreferences.hiddenFields.includes(field),
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
