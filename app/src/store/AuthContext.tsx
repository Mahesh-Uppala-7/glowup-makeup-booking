import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi, userApi } from '../api';
import { tokenStore } from '../api/client';
import { registerForPushNotifications } from '../utils/push';
import { AuthResult, User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requestOtp: (mobile: string, role?: 'CUSTOMER' | 'ARTIST') => Promise<{ devCode?: string }>;
  verifyOtp: (payload: {
    mobile: string;
    code: string;
    name?: string;
    role?: 'CUSTOMER' | 'ARTIST';
  }) => Promise<AuthResult>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    await tokenStore.load();
    if (tokenStore.hasSession()) {
      try {
        const me = await userApi.me();
        setUser(me);
        void registerForPushNotifications();
      } catch {
        await tokenStore.clear();
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    tokenStore.setAuthFailureHandler(() => setUser(null));
    void bootstrap();
  }, [bootstrap]);

  const requestOtp = useCallback(
    async (mobile: string, role?: 'CUSTOMER' | 'ARTIST') => {
      const res = await authApi.requestOtp(mobile, role);
      return { devCode: res.devCode };
    },
    [],
  );

  const verifyOtp = useCallback(
    async (payload: { mobile: string; code: string; name?: string; role?: 'CUSTOMER' | 'ARTIST' }) => {
      const result = await authApi.verifyOtp(payload);
      await tokenStore.set(result.tokens);
      setUser(result.user);
      void registerForPushNotifications();
      return result;
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const me = await userApi.me();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      requestOtp,
      verifyOtp,
      refreshUser,
      logout,
    }),
    [user, isLoading, requestOtp, verifyOtp, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
