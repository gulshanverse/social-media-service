import type { VibeProfile, VibeSession } from '@ggv/types';

const PROFILE_KEY = 'vibematch.profile.v1';
const SESSION_KEY = 'vibematch.session.v1';

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const vibeStorage = {
  getProfile: () => read<VibeProfile>(PROFILE_KEY),
  setProfile: (profile: VibeProfile) => write(PROFILE_KEY, profile),
  getSession: () => read<VibeSession>(SESSION_KEY),
  setSession: (session: VibeSession) => write(SESSION_KEY, session),
  clearSession: () => window.localStorage.removeItem(SESSION_KEY),
};
