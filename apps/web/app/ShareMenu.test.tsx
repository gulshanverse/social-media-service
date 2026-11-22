import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareMenu } from '../components/ShareMenu';

const url = 'https://www.confessions.live/confessions/conf-1';
const shareMessage = `Hey, check out this confession!❤️\nWhat do you think?😊\n\n${url}\n\n🌷 Explore Live Confessions:👇🏻\nhttps://www.confessions.live/confessions`;
const nativeShareMessage = `Hey, check out this confession!❤️\nWhat do you think?😊\n\n${url}\n\n🌷Explore Live Confessions:👇🏻\nhttps://www.confessions.live/confessions`;

function renderMenu() {
  return render(
    <ShareMenu
      url={url}
      title="College Confession"
      buttonContent={<span>Share</span>}
      buttonClassName="share-trigger"
    />,
  );
}

describe('ShareMenu', () => {
  const originalOpen = window.open;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() });
    window.open = vi.fn().mockReturnValue({});
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });

  afterEach(() => {
    window.open = originalOpen;
    window.matchMedia = originalMatchMedia;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens and closes from the trigger, close button, outside click, and Escape', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Share' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Share Confession' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close sharing options' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('traps Tab and Shift+Tab within the sharing dialog', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    const dialog = screen.getByRole('dialog', { name: 'Share Confession' });
    const dialogButtons = within(dialog).getAllByRole('button');
    const firstButton = dialogButtons[0];
    const lastButton = dialogButtons[dialogButtons.length - 1];

    lastButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(firstButton);
    firstButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastButton);
  });

  it('copies the exact canonical URL and keeps the panel open', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /^Copy Link/ }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Confession link copied!');
  });

  it('uses the supported WhatsApp message and canonical URL', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /^WhatsApp/ }));
    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
        '_blank',
        'noopener,noreferrer',
      ),
    );
  });

  it('shares the actual confession-card file with the final message when file sharing is supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('card', {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        }),
      ),
    );
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /^WhatsApp/ }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0]).toMatchObject({
      title: 'College Confession',
      text: nativeShareMessage,
    });
    expect(share.mock.calls[0][0].files).toHaveLength(1);
    expect(share.mock.calls[0][0].files[0].name).toBe('college-confession.png');
    expect(canShare).toHaveBeenCalledWith({ files: expect.any(Array) });
  });

  it('copies before offering Instagram and Snapchat handoff actions', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /^Instagram/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open Instagram' })).toBeInTheDocument(),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    fireEvent.click(screen.getByRole('button', { name: 'Open Instagram' }));
    expect(window.open).toHaveBeenCalledWith(
      'https://www.instagram.com/',
      '_blank',
      'noopener,noreferrer',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /^Snapchat/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open Snapchat' })).toBeInTheDocument(),
    );
  });

  it('provides a manual-copy fallback when the clipboard fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /^Copy Link/ }));
    await waitFor(() =>
      expect(screen.getByLabelText('Confession link to copy manually')).toHaveValue(url),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
  });

  it('handles native share success, cancellation, and unsupported fallback honestly', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'College Confession',
        text: nativeShareMessage,
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Native sharing is unavailable');
  });
});
