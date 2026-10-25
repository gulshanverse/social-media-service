import type { VibeProfile, VibeSession } from '@ggv/types';
const SESSION_KEY = 'vibematch.server-session.v1';
const QUICK_PLAY_KEY = 'vibematch.quick-play.v1';
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
  isQuickPlay: () =>
    typeof window !== 'undefined' && window.localStorage.getItem(QUICK_PLAY_KEY) === '1',
  setQuickPlay: (enabled: boolean) => {
    if (typeof window === 'undefined') return;
    if (enabled) window.localStorage.setItem(QUICK_PLAY_KEY, '1');
    else window.localStorage.removeItem(QUICK_PLAY_KEY);
  },
  clearSession: () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
  },
};
