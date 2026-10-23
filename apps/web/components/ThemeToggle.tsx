'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem('college-confession-theme');
    const nextTheme: Theme = stored === 'light' || stored === 'dark' ? stored : getSystemTheme();
    setTheme(nextTheme);
    document.body.dataset.theme = nextTheme;

    function handleThemeChange(event: Event) {
      const nextTheme = (event as CustomEvent<Theme>).detail;
      if (nextTheme !== 'light' && nextTheme !== 'dark') return;
      setTheme(nextTheme);
      document.body.dataset.theme = nextTheme;
    }

    document.addEventListener('college-confession-theme-change', handleThemeChange);
    return () => document.removeEventListener('college-confession-theme-change', handleThemeChange);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem('college-confession-theme', nextTheme);
    document.body.dataset.theme = nextTheme;
    document.dispatchEvent(
      new CustomEvent('college-confession-theme-change', { detail: nextTheme }),
    );
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
      <span className="theme-toggle__label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
