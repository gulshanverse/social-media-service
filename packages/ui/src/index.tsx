import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
export { ConfessionCard } from './ConfessionCard';

export function Button({
  children,
  className = '',
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button className={`ggv-button ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Logo() {
  return (
    <div className="ggv-logo" aria-label="College Confession">
      ♛ <span>GGV</span>
    </div>
  );
}
