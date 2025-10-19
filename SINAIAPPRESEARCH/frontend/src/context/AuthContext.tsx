import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { loadToken, saveToken, clearToken } from '../lib/authStorage';
import { setAuthToken } from '../lib/apiClient';

type AuthContextValue = {
  token: string | null;
  setToken: (value: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [token, setTokenState] = useState<string | null>(() => loadToken());

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const setToken = (value: string | null) => {
    setTokenState(value);
    if (value) {
      saveToken(value);
    } else {
      clearToken();
    }
  };

  const value = useMemo(() => ({ token, setToken }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
