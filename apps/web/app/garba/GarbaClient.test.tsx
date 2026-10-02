import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GarbaClient from './GarbaClient';

const garbaApi = vi.hoisted(() => ({
  createGarbaPost: vi.fn(),
  getGarba: vi.fn(),
}));

vi.mock('../../lib/garba-api', () => garbaApi);
vi.mock('next/link', () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

const emptyFeed = { items: [], season: null };

function fillForm() {
  fireEvent.change(screen.getByRole('combobox', { name: /post type/i }), {
    target: { value: 'EVENT' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /what's happening/i }), {
    target: { value: 'Meet us at the campus Garba event.' },
  });
  fireEvent.change(screen.getByLabelText(/event date/i), { target: { value: '2026-10-10' } });
  fireEvent.change(screen.getByLabelText(/location \/ venue/i), {
    target: { value: 'Campus ground' },
  });
  fireEvent.change(screen.getByLabelText(/instagram handle/i), { target: { value: '@garba' } });
}

describe('public Garba post form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    garbaApi.getGarba.mockResolvedValue(emptyFeed);
  });

  it('posts once, resets every field, keeps the success notice, and ends loading', async () => {
    let resolvePost!: (result: { message: string }) => void;
    garbaApi.createGarbaPost.mockImplementation(
      () => new Promise((resolve) => { resolvePost = resolve; }),
    );
    render(<GarbaClient />);
    fillForm();

    const form = screen.getByRole('heading', { name: 'Share your Garba plan' }).closest('form');
    if (!form) throw new Error('Garba post form was not rendered.');
    fireEvent.submit(form);
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    fireEvent.submit(form);
    expect(garbaApi.createGarbaPost).toHaveBeenCalledTimes(1);

    resolvePost({ message: 'Your Garba post is awaiting moderation.' });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your Garba post is awaiting moderation.',
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Post on Garba' })).toBeEnabled());
    expect(screen.getByRole('combobox', { name: /post type/i })).toHaveValue('GENERAL');
    expect(screen.getByRole('textbox', { name: /what's happening/i })).toHaveValue('');
    expect(screen.getByLabelText(/event date/i)).toHaveValue('');
    expect(screen.getByLabelText(/location \/ venue/i)).toHaveValue('');
    expect(screen.getByLabelText(/instagram handle/i)).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('retains native validation constraints and preserves input when the API rejects a post', async () => {
    garbaApi.createGarbaPost.mockRejectedValue(new Error('Post content is invalid.'));
    render(<GarbaClient />);
    fillForm();

    const content = screen.getByRole('textbox', { name: /what's happening/i });
    expect(content).toBeRequired();
    expect(content).toHaveAttribute('minlength', '10');
    const form = content.closest('form');
    if (!form) throw new Error('Garba post form was not rendered.');
    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent('Post content is invalid.');
    expect(content).toHaveValue('Meet us at the campus Garba event.');
    expect(screen.getByRole('combobox', { name: /post type/i })).toHaveValue('EVENT');
    expect(screen.getByRole('button', { name: 'Post on Garba' })).toBeEnabled();
  });
});
