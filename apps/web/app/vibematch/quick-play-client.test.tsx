import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestQuickPlayClient } from '../../components/vibematch/GuestQuickPlayClient';
import { LandingClient } from '../../components/vibematch/LandingClient';
import { startGuestPlay } from '../../lib/vibematch/api';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../../lib/vibematch/api', () => ({ startGuestPlay: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/vibematch/quick-play');
  vi.mocked(startGuestPlay).mockResolvedValue({
    guest: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    durationDays: 7,
  });
});

describe('VibeMatch guest-first entry', () => {
  it('offers Quick Play separately from the existing optional profile flow', () => {
    render(<LandingClient />);
    expect(screen.getByRole('link', { name: /Quick Play/i }).getAttribute('href')).toBe(
      '/vibematch/quick-play',
    );
    expect(screen.getByRole('link', { name: /My Vibe Profile/i }).getAttribute('href')).toBe(
      '/vibematch/create',
    );
    expect(screen.getByText(/not automatically transferred/i)).toBeTruthy();
  });

  it('rejects invalid values locally without creating a guest session', async () => {
    render(<GuestQuickPlayClient />);
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Instagram handle'), {
      target: { value: '@valid.name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start Quick Play' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/between 2 and 60/i);
    expect(startGuestPlay).not.toHaveBeenCalled();
  });

  it('normalizes valid input, starts the server guest session, and routes into the existing quiz', async () => {
    render(<GuestQuickPlayClient />);
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: '  Sam Student  ' },
    });
    fireEvent.change(screen.getByLabelText('Instagram handle'), {
      target: { value: ' @sam.student ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start Quick Play' }));
    await waitFor(() =>
      expect(startGuestPlay).toHaveBeenCalledWith({
        displayName: 'Sam Student',
        instagramUsername: 'sam.student',
      }),
    );
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/vibematch/play'));
    expect(window.localStorage.getItem('vibematch.quick-play.v1')).toBe('1');
  });

  it('explains that an expired guest session cannot be recovered', async () => {
    window.history.replaceState({}, '', '/vibematch/quick-play?expired=1');
    render(<GuestQuickPlayClient />);
    expect((await screen.findByRole('status')).textContent).toMatch(/expired after seven days/i);
    expect(screen.getByRole('status').textContent).toMatch(/can’t be recovered/i);
  });

  it('keeps valid form input after a recoverable session-start failure', async () => {
    vi.mocked(startGuestPlay).mockRejectedValueOnce(new Error('Please try again later.'));
    render(<GuestQuickPlayClient />);
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Sam Student' } });
    fireEvent.change(screen.getByLabelText('Instagram handle'), {
      target: { value: 'sam.student' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start Quick Play' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/try again later/i);
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Sam Student');
    expect((screen.getByLabelText('Instagram handle') as HTMLInputElement).value).toBe(
      'sam.student',
    );
  });
});
