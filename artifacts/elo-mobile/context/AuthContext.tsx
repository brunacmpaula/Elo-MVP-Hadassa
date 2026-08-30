import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '@workspace/api-client-react';
import { useRouter } from 'expo-router';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  loginAs: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem('@elo:user')
      .then((v) => {
        if (v) setUser(JSON.parse(v));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loginAs = async (role: UserRole) => {
    const mockUser: User = {
      id: role === 'MISSIONARY' ? 'm1' : 's1',
      name: role === 'MISSIONARY' ? 'João Silva' : 'Maria Oliveira',
      email: 'test@elo.com',
      role,
    };
    setUser(mockUser);
    await AsyncStorage.setItem('@elo:user', JSON.stringify(mockUser));
    router.replace('/(tabs)');
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@elo:user');
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('Missing AuthProvider');
  return ctx;
};
