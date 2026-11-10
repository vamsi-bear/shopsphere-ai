import React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shopsphere-session') || 'null');
    } catch {
      localStorage.removeItem('shopsphere-session');
      return null;
    }
  });

  useEffect(() => {
    if (session?.token) api.defaults.headers.common.Authorization = `Bearer ${session.token}`;
    else delete api.defaults.headers.common.Authorization;
  }, [session]);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('shopsphere-session', JSON.stringify(data));
    setSession(data);
    return data;
  };
  const register = async (credentials) => {
    const { data } = await api.post('/auth/register', credentials);
    localStorage.setItem('shopsphere-session', JSON.stringify(data));
    setSession(data);
    return data;
  };
  const logout = () => {
    localStorage.removeItem('shopsphere-session');
    delete api.defaults.headers.common.Authorization;
    setSession(null);
  };

  return <AuthContext.Provider value={useMemo(() => ({ ...session, login, register, logout }), [session])}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
