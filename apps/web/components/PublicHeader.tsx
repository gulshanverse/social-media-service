'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

const primaryLinks = [
  ['/', 'Home'],
  ['/confessions', 'Confessions'],
  ['/vibematch', 'VibeMatch'],
  ['/garba', 'GrabA'],
] as const;

const moreLinks = [
  ['/about', 'About'],
  ['/how-it-works', 'How it works'],
  ['/faq', 'FAQ'],
  ['/community-guidelines', 'Guidelines'],
  ['/safety', 'Safety & moderation'],
  ['/privacy', 'Privacy'],
  ['/contact', 'Contact'],
  ['/report', 'Report content'],
] as const;

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    body.classList.toggle('public-menu-open', open);
    if (open) {
      body.style.overflow = 'hidden';
      body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    } else {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      body.classList.remove('public-menu-open');
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <button
          className="public-menu-button"
          type="button"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span /> <span /> <span />
        </button>
        <Link href="/" className="public-header-brand" onClick={() => setOpen(false)}>
          <span className="public-header-mark" aria-hidden="true">
            ♛
          </span>
          <span>College Confession</span>
        </Link>
        <nav className="public-header__links" aria-label="Primary navigation">
          {primaryLinks.map(([href, label]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
          <details className="public-header__more">
            <summary>More</summary>
            <div className="public-header__more-menu">
              <Link href="/collegeconfession">College profile</Link>
              <span className="public-header__menu-label">Support &amp; safety</span>
              {moreLinks.map(([href, label]) => (
                <Link href={href} key={href}>
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <div className="public-header__actions">
          <ThemeToggle />
          <Link className="public-header-cta" href="/send">
            Send confession
          </Link>
        </div>
      </div>
      {open && (
        <button
          className="public-menu-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
        />
      )}
      <nav
        className={`public-drawer ${open ? 'public-drawer--open' : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="public-drawer-heading">
          <strong>Explore College Confession</strong>
          <button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        {[...primaryLinks, ['/collegeconfession', 'College profile'] as const, ...moreLinks].map(
          ([href, label]) => (
            <Link href={href} key={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ),
        )}
        <div className="public-drawer-theme">
          <ThemeToggle />
        </div>
        <Link className="home-button" href="/send" onClick={() => setOpen(false)}>
          Send a confession
        </Link>
      </nav>
    </header>
  );
}
