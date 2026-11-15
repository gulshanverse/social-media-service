import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PublicConfession } from '@ggv/types';
import ConfessionDetailClient from './ConfessionDetailClient';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('../../../components/ConfessionCard', () => ({
  ConfessionCard: ({ confession }: { confession: PublicConfession }) => (
    <article data-testid="confession-card">{confession.content}</article>
  ),
}));

vi.mock('./DiscussionSection', () => ({
  default: () => <section data-testid="discussion-section" />,
}));

const confession: PublicConfession = {
  publicId: 'conf-1',
  content: 'The card content stays on the detail page.',
  category: 'CRUSH',
  customCategory: null,
  theme: null,
  publishedAt: '2026-11-15T12:00:00.000Z',
  viewCount: 1,
};

describe('ConfessionDetailClient', () => {
  it('keeps the confession card and discussion while omitting the promotional CTA', () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);

    expect(screen.getByTestId('confession-card')).toHaveTextContent(confession.content);
    expect(screen.getByTestId('discussion-section')).toBeInTheDocument();
    expect(screen.queryByText('Have something to say?')).not.toBeInTheDocument();
    expect(screen.queryByText('Share your own anonymous confession')).not.toBeInTheDocument();
  });
});
