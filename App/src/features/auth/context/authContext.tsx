// @ts-nocheck
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { login as apiLogin, fetchCurrentUser, logout as apiLogout } from '../services/authService';
import { storeToken, getToken, clearToken } from '../../../utils/tokenStorage';
import { setUnauthorizedHandler } from '../../../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const mountedRef = useRef(true);

  const clearSession = useCallback(() => {
    setUser(null);
    clearToken().catch(() => {});
  }, []);

  // Restore session on app start.
  useEffect(() => {
    mountedRef.current = true;

    async function restore() {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        const currentUser = await fetchCurrentUser();
        if (mountedRef.current) {
          setUser(currentUser);
        }
      } catch {
        await clearToken();
        if (mountedRef.current) {
          setUser(null);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    restore();
    return () => {
      mountedRef.current = false;
    };
  }, [clearSession]);

  // Global 401/403 handler — clears session and returns to login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async (username, password) => {
    setIsSigningIn(true);
    try {
      const { token, user: loggedInUser } = await apiLogin(username, password);
      await storeToken(token);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      await clearToken();
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(user),
      isLoading,
      isSigningIn,
      signIn,
      signOut,
      clearSession,
    }),
    [user, isLoading, isSigningIn, signIn, signOut, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
