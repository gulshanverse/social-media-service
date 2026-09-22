'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const links = [
  ['/', 'Home'],
  ['/confessions', 'Community'],
  ['/send', 'Send a confession'],
  ['/about', 'About'],
  ['/community-guidelines', 'Community guidelines'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/contact', 'Contact'],
  ['/report', 'Report content'],
] as const;

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('public-menu-open', open);
    return () => document.body.classList.remove('public-menu-open');
  }, [open]);
  return (
    <header className="public-header">
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
        <span className="public-header-mark">♛</span>
        <span>College Confession</span>
      </Link>
      <Link className="public-header-cta" href="/send">
        Send anonymously
      </Link>
      {open && (
        <button
          className="public-menu-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
        />
      )}
      <nav
        className={`public-drawer ${open ? 'public-drawer--open' : ''}`}
        aria-label="Public navigation"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="public-drawer-heading">
          <strong>College Confession</strong>
          <button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        {links.map(([href, label]) => (
          <Link href={href} key={href} onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
