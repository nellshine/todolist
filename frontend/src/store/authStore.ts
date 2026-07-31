import { create } from 'zustand';
import { getToken, setToken as persistToken } from '../api/token-storage';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  isAuthenticated: getToken() !== null,
  setToken: (token) => {
    persistToken(token);
    set({ token, isAuthenticated: token !== null });
  },
  logout: () => {
    persistToken(null);
    set({ token: null, isAuthenticated: false });
  },
}));
