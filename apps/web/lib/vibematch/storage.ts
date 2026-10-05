import type { VibeProfile, VibeSession } from '@ggv/types';
const SESSION_KEY = 'vibematch.server-session.v1';
export const vibeStorage = {
  getProfile: (): VibeProfile | null => null,
  setProfile: (_profile: VibeProfile) => undefined,
  getSession: (): VibeSession | null => null,
  setSession: (_session: VibeSession) => undefined,
  getServerSessionId: () =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(SESSION_KEY),
  setServerSessionId: (id: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(SESSION_KEY, id);
  },
  clearSession: () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
  },
};
