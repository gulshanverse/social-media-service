import Link from 'next/link';
import type { PublicConfession } from '@ggv/types';
import { ConfessionCard as SharedConfessionCard } from '@ggv/ui';

export function ConfessionCard({
  confession,
  detailed = false,
  display,
}: {
  confession: PublicConfession;
  detailed?: boolean;
  display?: { cardTextSize: number; previewLines: number };
}) {
  const card = (
    <SharedConfessionCard confession={confession} detailed={detailed} display={display} />
  );

  return detailed ? (
    card
  ) : (
    <Link
      href={`/confessions/${confession.publicId}`}
      aria-label={`Read confession ${confession.publicId}`}
    >
      {card}
    </Link>
  );
}
