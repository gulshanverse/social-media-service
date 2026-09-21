'use client';

import { useState } from 'react';

export function ShareMenu({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  async function copy() {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(url);
      else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      setFeedback('Link copied!');
      setTimeout(() => setFeedback(''), 2200);
    } catch {
      setFeedback('Copy failed. You can copy the URL from your browser.');
    }
  }
  async function nativeShare() {
    if (navigator.share)
      await navigator.share({ title, text: 'Read this anonymous college confession', url });
    else await copy();
  }
  const encoded = encodeURIComponent(url);
  return (
    <div className="share-menu">
      <button
        className="ghost-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Share
      </button>
      {feedback && (
        <span className="share-feedback" role="status">
          {feedback}
        </span>
      )}
      {open && (
        <div className="share-popover" role="menu" aria-label="Share confession">
          <strong>Share confession</strong>
          <button role="menuitem" onClick={nativeShare}>
            More / Native share
          </button>
          <button role="menuitem" onClick={copy}>
            Copy link
          </button>
          <a
            role="menuitem"
            href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <a
            role="menuitem"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
          <a
            role="menuitem"
            href={`https://t.me/share/url?url=${encoded}&text=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noreferrer"
          >
            Telegram
          </a>
          <button role="menuitem" onClick={copy}>
            Instagram: copy link
          </button>
        </div>
      )}
    </div>
  );
}
