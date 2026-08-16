import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type PublicUser } from '@linuxpilot/auth-contracts';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../api/auth';
import { ApiRequestError } from '../api/client';
import {
  isExpiredSessionCode,
  mapLoginError,
  type LoginErrorKey,
} from '../features/auth/auth-errors';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  user: PublicUser | null;
  error: LoginErrorKey | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<LoginErrorKey | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((result) => {
        if (cancelled) return;
        setUser(result.user);
        setStatus('authenticated');
      })
      .catch((cause) => {
        if (cancelled) return;
        setUser(null);
        setStatus('anonymous');
        if (cause instanceof ApiRequestError && isExpiredSessionCode(cause.code)) {
          setError('sessionExpired');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      login: async (emailOrUsername, password) => {
        setError(null);
        try {
          const result = await loginRequest({ emailOrUsername, password });
          setUser(result.user);
          setStatus('authenticated');
        } catch (cause) {
          setError(mapLoginError(cause));
          setStatus('anonymous');
          throw cause;
        }
      },
      logout: async () => {
        try {
          await logoutRequest();
          setUser(null);
          setStatus('anonymous');
          setError(null);
        } catch (cause) {
          if (cause instanceof ApiRequestError && cause.code === AUTH_ERROR_CODES.CSRF_REJECTED) {
            setError('csrfRejected');
            return;
          }
          setUser(null);
          setStatus('anonymous');
          setError('logoutIncomplete');
        }
      },
    }),
    [error, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
