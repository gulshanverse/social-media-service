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
export type ConfessionStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type AdminRole = 'SUPER_ADMIN' | 'MODERATOR' | 'DESIGNER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ARCHIVED';
export type PublicTheme = {
  id: string;
  name: string;
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  radius: string;
};
export type PublicConfession = {
  publicId: string;
  content: string;
  category: ConfessionCategory | null;
  theme: PublicTheme | null;
  publishedAt: string;
};
export type PublicConfessionPage = {
  items: PublicConfession[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
export type SubmissionResult = { publicId: string; status: 'PENDING'; message: string };
