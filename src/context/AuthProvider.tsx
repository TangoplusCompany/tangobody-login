import React, { useState } from 'react';
import type { AuthResponse } from '../api/auth';
import { AuthContext } from './AuthContext';

const STORAGE_KEY_AUTH = 'tangobody_auth_result';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthDataState] = useState<AuthResponse | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_AUTH);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setAuthData = (data: AuthResponse | null) => {
    setAuthDataState(data);
    if (data) {
      sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
    }
  };

  const clearAuth = () => {
    setAuthDataState(null);
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
  };

  return (
    <AuthContext.Provider value={{ authData, setAuthData, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

