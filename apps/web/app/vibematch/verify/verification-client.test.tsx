import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  verifyMagicLink: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('../../../lib/vibematch/api', () => ({ verifyMagicLink: mocks.verifyMagicLink }));

import { MagicLinkVerification } from '../../../components/vibematch/MagicLinkVerification';

describe('VibeMatch magic-link callback', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.verifyMagicLink.mockReset();
    window.history.replaceState({}, '', '/vibematch/verify#token=one-time-test-token');
  });

  it('removes the token fragment before requiring an explicit verification click', async () => {
    mocks.verifyMagicLink.mockResolvedValue({ authenticated: true, hasProfile: false });
    render(<MagicLinkVerification />);

    const continueButton = await screen.findByRole('button', { name: /continue securely/i });
    expect(window.location.hash).toBe('');
    expect(mocks.verifyMagicLink).not.toHaveBeenCalled();

    fireEvent.click(continueButton);
    await waitFor(() => expect(mocks.verifyMagicLink).toHaveBeenCalledWith('one-time-test-token'));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/vibematch/create#verified'));
  });

  it('sends already-profiled identities to gameplay after verification', async () => {
    mocks.verifyMagicLink.mockResolvedValue({ authenticated: true, hasProfile: true });
    render(<MagicLinkVerification />);
    fireEvent.click(await screen.findByRole('button', { name: /continue securely/i }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/vibematch/play'));
  });

  it('shows a generic failure without displaying the submitted token or provider details', async () => {
    mocks.verifyMagicLink.mockRejectedValue(new Error('sensitive-token-and-provider-detail'));
    render(<MagicLinkVerification />);
    fireEvent.click(await screen.findByRole('button', { name: /continue securely/i }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/invalid or expired/i);
    expect(alert.textContent).not.toContain('one-time-test-token');
    expect(alert.textContent).not.toContain('sensitive-token-and-provider-detail');
  });
});
