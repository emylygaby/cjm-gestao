import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService, clearAuthToken, getAuthToken, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = async () => {
    const token = getAuthToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authService.me();
      setUser(response.data);
    } catch (error) {
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const login = async (username, password) => {
    const response = await authService.login({ username, password });
    const { token, user: loggedUser } = response.data;

    setAuthToken(token);
    setUser(loggedUser);

    return loggedUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Se o token já estiver inválido, apenas limpa o estado local.
    } finally {
      clearAuthToken();
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.is_staff),
      login,
      logout,
      reloadUser: loadCurrentUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
};
