import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const FIXED_REACTIONS = ['❤️', '😂', '🫶', '👍', '🔥', '💡'] as const;
export const REPORT_REASONS = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'SCAM', 'OTHER'] as const;

export class ProfileDto {
  @IsString() @MinLength(1) @MaxLength(60) displayName!: string;
  @IsString() @MinLength(1) @MaxLength(30) instagramUsername!: string;
}
export class CommentDto {
  @IsString() @MinLength(1) @MaxLength(1000) content!: string;
  @IsOptional() @IsString() @MaxLength(40) parentId?: string;
}
export class ReactionDto {
  @IsString() @MinLength(1) @MaxLength(16) emoji!: string;
}
export class CommentReportDto {
  @IsIn(REPORT_REASONS) reason!: (typeof REPORT_REASONS)[number];
  @IsOptional() @IsString() @MaxLength(500) details?: string;
}
export function normalizeInstagramUsername(value: string) {
  const username = value.trim().replace(/^@+/, '');
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) throw new Error('Enter a valid Instagram username.');
  return username;
}
export function normalizeEmoji(value: string) {
  const emoji = value.trim();
  const codePoints = Array.from(emoji);
  if (!codePoints.length || codePoints.length > 8 || /[\u0000-\u001f\u007f]/u.test(emoji))
    throw new Error('Choose a valid emoji reaction.');
  if (!codePoints.some((point) => /\p{Extended_Pictographic}/u.test(point)))
    throw new Error('Choose a valid emoji reaction.');
  return emoji;
}
