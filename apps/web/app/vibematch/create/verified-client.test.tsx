import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getProfile: vi.fn(),
  requestMagicLink: vi.fn(),
  saveProfile: vi.fn(),
  verifyMagicLink: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../../../lib/vibematch/api', () => ({
  getProfile: mocks.getProfile,
  requestMagicLink: mocks.requestMagicLink,
  saveProfile: mocks.saveProfile,
  verifyMagicLink: mocks.verifyMagicLink,
}));

import { CreateVibeForm } from '../../../components/vibematch/CreateVibeForm';

describe('verified VibeMatch profile creation', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.getProfile.mockReset().mockResolvedValue(null);
    mocks.requestMagicLink.mockReset();
    mocks.saveProfile.mockReset().mockResolvedValue({ id: 'profile-test' });
    mocks.verifyMagicLink.mockReset();
    window.history.replaceState({}, '', '/vibematch/create#verified');
  });

  it('uses the verified session instead of requesting a second sign-in link', async () => {
    render(<CreateVibeForm />);
    await waitFor(() => expect(screen.queryByLabelText(/private email/i)).toBeNull());

    fireEvent.change(screen.getByLabelText(/name or nickname/i), {
      target: { value: 'Staging Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /new friends/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /start my vibe/i }));

    await waitFor(() => expect(mocks.saveProfile).toHaveBeenCalled());
    expect(mocks.requestMagicLink).not.toHaveBeenCalled();
    expect(mocks.verifyMagicLink).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith('/vibematch/play');
  });
});
