import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const storedUser = localStorage.getItem('userInfo');
    if (!storedUser) return;
    
    const parsed = JSON.parse(storedUser);
    try {
      const { data } = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${parsed.token}` }
      });
      const updatedUser = { ...data, token: parsed.token };
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Session refresh failed:', error);
      if (error.response?.status === 401) logout();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('userInfo');
      if (storedUser) {
        // First set stored user so UI doesn't flicker
        setUser(JSON.parse(storedUser));
        // Then refresh in background to get latest fields
        await refreshUser();
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post('/api/auth/login', { email, password }, config);
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response && error.response.data.message 
          ? error.response.data.message 
          : error.message 
      };
    }
  };

  const register = async (userData) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post('/api/auth/register', userData, config);
      return { success: true, message: data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response && error.response.data.message 
          ? error.response.data.message 
          : error.message 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
