import { create } from 'zustand';
import { Id } from '../types';

type AuthState = {
  token: string | null;
  userId: Id | null;
  isAuthenticated: boolean;
  setAuth: (token: string, userId: Id) => void;
  logout: () => void;
};

function getInitialState(): AuthState {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  return {
    token,
    userId,
    isAuthenticated: !!token,
    setAuth: () => {},
    logout: () => {},
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialState(),
  setAuth: (token, userId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }
    set({ token, userId, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    }
    set({ token: null, userId: null, isAuthenticated: false });
  },
}));
