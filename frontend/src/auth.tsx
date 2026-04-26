import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api, setToken, getToken } from './api';

export type User = { id: string; email: string; name: string; role: 'admin' | 'merchant' | 'customer'; phone?: string; avatar_url?: string };

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, name: string, role: 'customer' | 'merchant') => Promise<User>;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      await setToken(null);
      setUser(null);
    }
  }

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const res: any = await api.login({ email, password });
    await setToken(res.token);
    setUser(res.user);
    return res.user;
  }
  async function signUp(email: string, password: string, name: string, role: 'customer' | 'merchant') {
    const res: any = await api.register({ email, password, name, role });
    await setToken(res.token);
    setUser(res.user);
    return res.user;
  }
  async function signOut() {
    await setToken(null);
    setUser(null);
  }

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  function signInWithGoogle() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  }

  // Handle session_id hash coming back from Emergent OAuth
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) return;
    const sid = decodeURIComponent(m[1]);
    // clean URL immediately
    try { window.history.replaceState({}, '', window.location.pathname + window.location.search); } catch {}
    (async () => {
      try {
        const res: any = await api.oauthProcess(sid);
        await setToken(res.token);
        setUser(res.user);
      } catch (e) {
        // silently ignore invalid session
      }
    })();
  }, []);

  return <Ctx.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
