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
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user: User) => {
        // SECURITY: Token is stored in httpOnly cookie, only persist user data
        set({ user });
      },
      logout: () => {
        set({ user: null });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
