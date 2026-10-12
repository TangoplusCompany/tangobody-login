import { createContext } from 'react';
import type { AuthResponse } from '../api/auth';

export interface AuthContextType {
  authData: AuthResponse | null;
  setAuthData: (data: AuthResponse | null) => void;
  clearAuth: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

