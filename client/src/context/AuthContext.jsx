import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, email: identifier, password });
    setUser(res.data);
    return res.data;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    setUser(res.data);
    return res.data;
  }, []);

  const sendOtp = useCallback(async (mobile) => {
    const res = await api.post('/auth/otp/send', { mobile });
    return res.data;
  }, []);

  const verifyOtp = useCallback(async (mobile, otp, name) => {
    const res = await api.post('/auth/otp/verify', { mobile, otp, name });
    if (res.data?.id) {
      setUser(res.data);
    }
    return res.data;
  }, []);

  const completeRegistration = useCallback(async (registration_token, name) => {
    const res = await api.post('/auth/otp/complete-registration', { registration_token, name });
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      sendOtp,
      verifyOtp,
      completeRegistration,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, register, logout, sendOtp, verifyOtp, completeRegistration],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
