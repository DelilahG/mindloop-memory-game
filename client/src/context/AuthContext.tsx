import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { PlayerProfile } from '@mindloop/shared';
import { api, setToken, clearToken } from '../api/client';
import type { AuthResponse, MeResponse } from '../api/client';

interface AuthContextValue {
  player: PlayerProfile | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = (await res.json()) as AuthResponse;
          setToken(data.accessToken);
          if (!cancelled) setPlayer(data.player);
        }
      } catch {
        // no session to restore
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (loginVal: string, password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/login', {
      login: loginVal,
      password,
    });
    setToken(data.accessToken);
    setPlayer(data.player);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/register', {
      username,
      email,
      password,
    });
    setToken(data.accessToken);
    setPlayer(data.player);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // clear local state even if the call fails
    }
    clearToken();
    setPlayer(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const data = await api.get<MeResponse>('/api/auth/me');
    setPlayer(data.player);
  }, []);

  return (
    <AuthContext value={{ player, isLoading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
