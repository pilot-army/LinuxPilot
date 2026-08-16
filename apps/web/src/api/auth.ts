import { type LoginRequest, type PublicUser, type SessionView } from '@linuxpilot/auth-contracts';
import { apiRequest } from './client';

export function login(body: LoginRequest): Promise<{ user: PublicUser }> {
  return apiRequest('/auth/login', { method: 'POST', body, retry: false });
}

export function fetchCurrentUser(): Promise<{ user: PublicUser }> {
  return apiRequest('/auth/me');
}

export function logout(): Promise<{ success: boolean }> {
  return apiRequest('/auth/logout', { method: 'POST', retry: false });
}

export function fetchSessions(): Promise<{ sessions: SessionView[] }> {
  return apiRequest('/auth/sessions');
}
