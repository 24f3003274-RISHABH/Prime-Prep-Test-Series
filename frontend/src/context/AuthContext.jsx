import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCurrentUser,
  loginUser,
  registerStudent,
  setupInitialAdmin,
  logoutUser,
  getAuthToken,
} from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const restoreSession = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Session restoration failed:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await loginUser({ email, password });
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    }
  };

  const register = async (fullName, email, password) => {
    setError(null);
    try {
      const res = await registerStudent({ fullName, email, password });
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const setupAdmin = async (setupSecret, fullName, email, password) => {
    setError(null);
    try {
      const res = await setupInitialAdmin({ setupSecret, fullName, email, password });
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message || 'Admin setup failed.');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    loading,
    error,
    login,
    register,
    setupAdmin,
    logout,
    restoreSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
