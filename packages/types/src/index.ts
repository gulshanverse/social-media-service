export const confessionCategories = [
  'CRUSH',
  'RELATIONSHIP',
  'FRIENDSHIP',
  'FUNNY',
  'COLLEGE_LIFE',
  'ADVICE',
  'APPRECIATION',
  'RANT',
  'OTHER',
] as const;
export type ConfessionCategory = (typeof confessionCategories)[number];
export type ConfessionStatus = 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type AdminRole = 'SUPER_ADMIN' | 'MODERATOR' | 'DESIGNER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ARCHIVED';
export type PublicConfession = {
  publicId: string;
  content: string;
  category: ConfessionCategory | null;
  themeId: string | null;
  publishedAt: string | null;
};
