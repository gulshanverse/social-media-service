export type EngagementIconName =
  'eye' | 'heart' | 'message' | 'send' | 'bookmark' | 'flag' | 'user';

export function EngagementIcon({
  name,
  className,
}: {
  name: EngagementIconName;
  className?: string;
}) {
  const shared = {
    'aria-hidden': true as const,
    className,
    fill: 'none',
    focusable: false as const,
    height: 18,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    width: 18,
  };

  switch (name) {
    case 'eye':
      return (
        <svg {...shared}>
          <path d="M2.1 12s3.6-7 9.9-7 9.9 7 9.9 7-3.6 7-9.9 7-9.9-7-9.9-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...shared}>
          <path d="M20.8 8.7c0 4.1-8.8 10.1-8.8 10.1S3.2 12.8 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
        </svg>
      );
    case 'message':
      return (
        <svg {...shared}>
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 4a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.4Z" />
        </svg>
      );
    case 'send':
      return (
        <svg {...shared}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg {...shared}>
          <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4Z" />
        </svg>
      );
    case 'flag':
      return (
        <svg {...shared}>
          <path d="M5 21V5m0 0c5-4 9 4 14 0v11c-5 4-9-4-14 0" />
        </svg>
      );
    case 'user':
      return (
        <svg {...shared}>
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </svg>
      );
  }
}
