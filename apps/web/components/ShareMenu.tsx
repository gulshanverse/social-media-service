'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

const INSTAGRAM_URL = 'https://www.instagram.com/';
const SNAPCHAT_URL = 'https://www.snapchat.com/';
const SHARE_MESSAGE = 'Hey, check out this confession! 😂❤️\nWhat do you think?';
const WHATSAPP_MESSAGE = SHARE_MESSAGE;
const EXPLORE_URL = 'https://www.confessions.live/confessions';

type ShareAction = 'instagram' | 'whatsapp' | 'snapchat' | 'facebook' | 'copy' | 'native';

type ShareMenuProps = {
  url: string;
  title: string;
  buttonContent?: ReactNode;
  buttonClassName?: string;
};

function PlatformIcon({ platform }: { platform: ShareAction }) {
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect
          x="3.2"
          y="3.2"
          width="17.6"
          height="17.6"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.4" cy="6.7" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (platform === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M20.4 3.6A11.9 11.9 0 0 0 3.1 19.2L2 22l2.9-1a11.9 11.9 0 0 0 15.5-17.4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8.5 7.4c.3-.3.7-.3 1-.1l1.1 1.6c.2.3.2.7-.1 1l-.7.7c.5 1 1.3 1.8 2.3 2.3l.7-.7c.3-.3.7-.3 1-.1l1.6 1.1c.3.2.3.7.1 1-.5.7-1.3 1.2-2.2 1.1-3.6-.5-6.4-3.3-6.9-6.9-.1-.9.4-1.7 1.1-2.2Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (platform === 'snapchat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 3.2c-2.8 0-4.6 2-4.6 4.8v1.2c0 .5-.3.9-.8 1.1l-1.3.5c-.5.2-.5.9 0 1.1l1.7.7c.2 1.2 1 2.1 2.1 2.7-.4.7-1.1 1-2 1.2-.5.1-.6.8-.2 1.1.7.5 1.7.6 2.6.3.6.9 1.5 1.5 2.5 1.5s1.9-.6 2.5-1.5c.9.3 1.9.2 2.6-.3.4-.3.3-1-.2-1.1-.9-.2-1.6-.5-2-1.2 1.1-.6 1.9-1.5 2.1-2.7l1.7-.7c.5-.2.5-.9 0-1.1l-1.3-.5c-.5-.2-.8-.6-.8-1.1V8c0-2.8-1.8-4.8-4.6-4.8Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (platform === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M13.8 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.5-4 4.1V10H8v3h2.7v8h3.1Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (platform === 'copy') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M8 8h10v12H8zM6 16H4V4h10v2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="5" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" />
    </svg>
  );
}

function openExternal(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(url);
  return Boolean(opened);
}

function getShareImageUrl(url: string) {
  const confessionUrl = new URL(url);
  return `${confessionUrl.origin}${confessionUrl.pathname.replace(/\/$/u, '')}/share-image`;
}

type NativeShareResult = 'shared' | 'cancelled' | 'unsupported' | 'failed';

export function ShareMenu({ url, title, buttonContent, buttonClassName }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const [showImageDownload, setShowImageDownload] = useState(false);
  const [imageDownloadBusy, setImageDownloadBusy] = useState(false);
  const [busy, setBusy] = useState<ShareAction | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const feedbackTimerRef = useRef<number | undefined>(undefined);
  const dragStartYRef = useRef<number | null>(null);

  function announce(message: string) {
    setFeedback(message);
    if (feedbackTimerRef.current !== undefined) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), 5200);
  }

  function close() {
    setOpen(false);
    setManualCopy(false);
    window.setTimeout(() => {
      (previousFocusRef.current ?? triggerRef.current)?.focus();
      previousFocusRef.current = null;
    }, 0);
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const isMobile = () => window.matchMedia('(max-width: 720px)').matches;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    if (isMobile()) {
      body.style.overflow = 'hidden';
      body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    }
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement) || !panelRef.current.contains(activeElement))
        return;
      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        closeRef.current?.focus();
        return;
      }
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current !== undefined) window.clearTimeout(feedbackTimerRef.current);
    },
    [],
  );

  async function copyLink(message = 'Confession link copied! ❤️') {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly', 'true');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        try {
          if (!document.execCommand('copy')) throw new Error('Copy command failed');
        } finally {
          input.remove();
        }
      }
      setManualCopy(false);
      announce(message);
      return true;
    } catch {
      setManualCopy(true);
      announce('Copy failed. Select and copy the link below.');
      return false;
    }
  }

  async function getShareImageFile() {
    const response = await fetch(getShareImageUrl(url), { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Share image unavailable');
    const blob = await response.blob();
    return new File([blob], 'college-confession.png', { type: blob.type || 'image/png' });
  }

  async function shareNativeText(): Promise<NativeShareResult> {
    if (!navigator.share) return 'unsupported';
    try {
      await navigator.share({
  title,
  text: `${SHARE_MESSAGE}\n\n${url}\n\n✨ Explore Live Confessions:\n${EXPLORE_URL}`,
});
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      return 'failed';
    }
  }

  async function shareNativeWithImage(): Promise<NativeShareResult> {
    if (!navigator.share || !navigator.canShare) return 'unsupported';
    try {
      const file = await getShareImageFile();
      if (!navigator.canShare({ files: [file] })) return 'unsupported';
      await navigator.share({
  title,
  text: `${SHARE_MESSAGE}\n\n${url}\n\n🌷Explore Live Confessions:👇🏻\n${EXPLORE_URL}`,
  files: [file],
});
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      return 'failed';
    }
  }

  async function downloadShareImage() {
    if (imageDownloadBusy) return;
    setImageDownloadBusy(true);
    try {
      const response = await fetch(getShareImageUrl(url), { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Share image unavailable');
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'college-confession.png';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      announce('Confession card saved. Attach it to your message.');
    } catch {
      announce('The confession card could not be saved. Try the link instead.');
    } finally {
      setImageDownloadBusy(false);
    }
  }

  async function runAction(action: ShareAction) {
    if (busy) return;
    setBusy(action);
    try {
      if (action === 'copy') {
        await copyLink();
        return;
      }
      if (action === 'instagram') {
        if (await copyLink('Link copied! Open Instagram and share it with your friends.')) {
          setShowImageDownload(true);
          announce('Link copied! Tap Open Instagram to continue.');
        }
        return;
      }
      if (action === 'snapchat') {
        if (await copyLink('Link copied! Open Snapchat and paste it into a conversation.')) {
          setShowImageDownload(true);
          announce('Link copied! Tap Open Snapchat to continue.');
        }
        return;
      }
      if (action === 'whatsapp') {
        const nativeResult = await shareNativeWithImage();
        if (nativeResult === 'shared') {
          close();
          return;
        }
        if (nativeResult === 'cancelled') return;
        const message = `${WHATSAPP_MESSAGE}\n\n${url}\n\n🌷 Explore Live Confessions:👇🏻\n${EXPLORE_URL}`;

const opened = openExternal(
  `https://wa.me/?text=${encodeURIComponent(message)}`,
);
        if (opened) close();
        else {
          setShowImageDownload(true);
          announce('WhatsApp could not attach the card. Save it and share the link manually.');
        }
        return;
      }
      if (action === 'facebook') {
        const opened = openExternal(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        );
        if (opened) close();
        else {
          setShowImageDownload(true);
          announce('Facebook could not be opened. Save the card and share the link manually.');
        }
        return;
      }
      if (action === 'native') {
        const imageResult = await shareNativeWithImage();
        if (imageResult === 'shared') {
          close();
          return;
        }
        if (imageResult === 'cancelled') return;
        const textResult = await shareNativeText();
        if (textResult === 'shared') close();
        else if (textResult === 'cancelled') return;
        else {
          setShowImageDownload(true);
          await copyLink('Native sharing is unavailable. The confession link was copied.');
        }
      }
    } finally {
      setBusy(null);
    }
  }

  function handleDragStart(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') return;
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleDragEnd(event: React.PointerEvent<HTMLDivElement>) {
    const startY = dragStartYRef.current;
    dragStartYRef.current = null;
    if (startY !== null && event.clientY - startY > 64) close();
  }

  const options: Array<{
    action: ShareAction;
    label: string;
    supporting: string;
    className: string;
  }> = [
    {
      action: 'instagram',
      label: 'Instagram',
      supporting: 'Send on DM',
      className: 'is-instagram',
    },
    {
      action: 'whatsapp',
      label: 'WhatsApp',
      supporting: 'Share in chat',
      className: 'is-whatsapp',
    },
    {
      action: 'snapchat',
      label: 'Snapchat',
      supporting: 'Paste in chat',
      className: 'is-snapchat',
    },
    { action: 'facebook', label: 'Facebook', supporting: 'Share post', className: 'is-facebook' },
    { action: 'copy', label: 'Copy Link', supporting: 'Keep open', className: 'is-copy' },
    { action: 'native', label: 'More', supporting: 'Native Share', className: 'is-more' },
  ];

  return (
    <div className={`share-menu ${open ? 'is-open' : ''}`} data-no-confession-swipe>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName ?? 'ghost-button'}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? 'Close sharing options' : 'Share'}
        data-no-confession-swipe
      >
        {buttonContent ?? 'Share'}
      </button>
      {open && (
        <button
          className="share-backdrop"
          type="button"
          aria-label="Close sharing options"
          onClick={close}
        />
      )}
      {open && (
        <div
          ref={panelRef}
          className="share-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-panel-title"
          data-no-confession-swipe
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <div
            className="share-panel__handle"
            role="presentation"
            onPointerDown={handleDragStart}
            onPointerUp={handleDragEnd}
            onPointerCancel={() => {
              dragStartYRef.current = null;
            }}
          />
          <div className="share-panel__header">
            <span className="share-panel__header-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle
                  cx="18"
                  cy="5"
                  r="2.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle
                  cx="6"
                  cy="12"
                  r="2.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle
                  cx="18"
                  cy="19"
                  r="2.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m8 11 7.8-4.6M8 13l7.8 4.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            <div>
              <h2 id="share-panel-title">Share Confession</h2>
              <p>Send this confession to your friends</p>
            </div>
            <button
              ref={closeRef}
              className="share-panel__close"
              type="button"
              onClick={close}
              aria-label="Close sharing options"
            >
              ×
            </button>
          </div>
          <div className="share-options" role="list" aria-label="Sharing options">
            {options.map((option) => (
              <button
                key={option.action}
                type="button"
                className={`share-option ${option.className}`}
                onClick={() => void runAction(option.action)}
                disabled={Boolean(busy)}
                data-no-confession-swipe
              >
                <span className="share-option__icon">
                  <PlatformIcon platform={option.action} />
                </span>
                <span className="share-option__label">{option.label}</span>
                <span className="share-option__supporting">{option.supporting}</span>
              </button>
            ))}
          </div>
          {(feedback || manualCopy) && (
            <div className="share-panel__feedback" role="status" aria-live="polite">
              <p>{feedback}</p>
              {manualCopy && (
                <input
                  type="url"
                  value={url}
                  readOnly
                  aria-label="Confession link to copy manually"
                  onFocus={(event) => event.currentTarget.select()}
                />
              )}
              {feedback.includes('Instagram') && (
                <button
                  type="button"
                  onClick={() => {
                    openExternal(INSTAGRAM_URL);
                    close();
                  }}
                >
                  Open Instagram
                </button>
              )}
              {feedback.includes('Snapchat') && (
                <button
                  type="button"
                  onClick={() => {
                    openExternal(SNAPCHAT_URL);
                    close();
                  }}
                >
                  Open Snapchat
                </button>
              )}
              {showImageDownload && (
                <button
                  type="button"
                  onClick={() => void downloadShareImage()}
                  disabled={imageDownloadBusy}
                >
                  {imageDownloadBusy ? 'Saving card…' : 'Save confession card'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
