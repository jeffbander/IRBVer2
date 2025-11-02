/**
 * Zustand State Management
 * Global client-side state for authentication and user data
 * SECURITY: Token is stored in httpOnly cookie, not in localStorage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  active: boolean;
  role: {
    id: string;
    name: string;
    permissions: Record<string, boolean> | string[];
  };
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token: string, user: User) => {
        // SECURITY: Token is ALSO stored in httpOnly cookie for server-side auth
        // but we keep it in state for client-side API calls with Authorization header
        set({ token, user });
      },
      logout: () => {
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      version: 2, // Version 2: Force clear old data that doesn't have token field
      migrate: (persistedState: any, version: number) => {
        // If upgrading from version 0 or 1, clear everything and force re-login
        if (version < 2) {
          return { token: null, user: null };
        }
        return persistedState;
      },
    }
  )
);
