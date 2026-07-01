// Admin authentication state. Persists a JWT in localStorage and validates it
// against the backend on load.

import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";
import type { AdminUser } from "./types";

export interface AuthState {
  user: AdminUser | null;
  ready: boolean;          // finished checking existing token
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token, user } = await api.login(username, password);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return { user, ready, login, logout };
}
