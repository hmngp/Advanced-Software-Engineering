// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axiosBase, { AxiosError } from 'axios';

type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
  // handy helpers
  isProvider: boolean;
  isCustomer: boolean;
  isAdmin: boolean;
}

// ---- axios instance with baseURL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const api = axiosBase.create({
  baseURL: API_BASE,
  // If you use cookies/sessions, set withCredentials: true.
  // You're using Bearer tokens, so no need:
  withCredentials: false,
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Attach/detach Authorization header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch {
        // bad JSON - clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const normalizeError = (err: unknown): Error => {
    if (axiosBase.isAxiosError(err)) {
      const ae = err as AxiosError<any>;
      const msg =
        ae.response?.data?.error ||
        ae.response?.data?.message ||
        ae.message ||
        'Request failed';
      return new Error(msg);
    }
    return new Error((err as Error)?.message || 'Request failed');
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token: newToken, user: newUser } = res.data as { token: string; user: User };

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (e) {
      throw normalizeError(e);
    }
  };

  const register = async (name: string, email: string, password: string, role: Role) => {
    try {
      // Backend must return { token, user } OR we follow up with login.
      const res = await api.post('/api/auth/register', { name, email, password, role });

      if (res.data?.token && res.data?.user) {
        // If your backend returns token + user on register:
        const { token: newToken, user: newUser } = res.data as { token: string; user: User };
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
      } else {
        // If it doesn't, fallback to login:
        await login(email, password);
      }
    } catch (e) {
      throw normalizeError(e);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  };

  const isProvider = user?.role === 'PROVIDER';
  const isCustomer = user?.role === 'CUSTOMER';
  const isAdmin = user?.role === 'ADMIN';

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      isProvider,
      isCustomer,
      isAdmin,
    }),
    [user, token, loading, isProvider, isCustomer, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
