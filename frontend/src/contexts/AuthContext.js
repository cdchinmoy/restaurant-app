import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        withCredentials: true,
      });
      setUser(data);
    } catch (error) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    setUser(data);
    return data;
  };

  const register = async (email, password, name, phone) => {
    const { data } = await axios.post(
      `${BACKEND_URL}/api/auth/register`,
      { email, password, name, phone },
      { withCredentials: true }
    );
    setUser(data);
    return data;
  };

  const logout = async () => {
    await axios.post(
      `${BACKEND_URL}/api/auth/logout`,
      {},
      { withCredentials: true }
    );
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
