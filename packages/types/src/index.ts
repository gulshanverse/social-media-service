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
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  logoVisibility?: boolean;
  handleVisibility?: boolean;
  layoutVariant?: string;
  tokens?: Record<string, string>;
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
  display?: { cardTextSize: number; previewLines: number };
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
export type SubmissionResult = { publicId: string; status: 'PENDING'; message: string };
export * from './read-live-button';

export const vibeMatchRoundTypes = [
  'QUICK_PICK',
  'SCENARIO',
  'WOULD_YOU_RATHER',
  'THIS_OR_THAT',
] as const;
export type VibeMatchRoundType = (typeof vibeMatchRoundTypes)[number];

export const vibeMatchCategories = [
  'PERSONALITY',
  'SOCIAL',
  'ADVENTURE',
  'HUMOR',
  'COMMUNICATION',
  'LIFESTYLE',
] as const;
export type VibeMatchCategory = (typeof vibeMatchCategories)[number];

export const vibeDimensions = [
  'socialEnergy',
  'adventure',
  'spontaneity',
  'humor',
  'communication',
  'intent',
] as const;
export type VibeDimension = (typeof vibeDimensions)[number];
export type VibeDna = Record<VibeDimension, number>;
export type VibeDnaMapping = Partial<Record<VibeDimension, number>>;
export type VibeAnswerOption = {
  id: string;
  label: string;
  dnaContribution: VibeDnaMapping;
};
export type VibeQuestion = {
  id: string;
  prompt: string;
  category: VibeMatchCategory;
  roundType: VibeMatchRoundType;
  answerOptions: VibeAnswerOption[];
  active: boolean;
  season: string;
  difficulty: 1 | 2 | 3;
  weight: number;
  dnaMappings: VibeDnaMapping;
  metadata?: Record<string, string>;
};
export type VibeProfile = {
  id: string;
  name: string;
  instagramUsername?: string;
  college: string;
  primaryIntent: string;
  secondaryIntent?: string;
  ageConfirmed: boolean;
};
export type VibeSessionStatus = 'READY' | 'PLAYING' | 'COMPLETED';
export type VibeSession = {
  id: string;
  profileId: string;
  currentRound: number;
  totalRounds: number;
  selectedQuestionIds: string[];
  answeredQuestionIds: string[];
  answers: Record<string, string>;
  dna: VibeDna;
  status: VibeSessionStatus;
  seed: number;
};
