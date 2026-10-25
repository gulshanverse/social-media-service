import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
export const VIBE_INTENTS = [
  'Someone special',
  'New friends',
  'Event partner',
  'Study buddy',
  'Gaming buddy',
  'Just meeting people',
] as const;
export class MagicLinkDto {
  @IsEmail() email!: string;
}
export class GuestStartDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/^@/, '') : value))
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9._]+$/)
  instagramUsername!: string;
}
export class EligibilityDto {
  @IsBoolean() ageConfirmed!: boolean;
}
export class ProfileDto {
  @IsString() @MinLength(1) @MaxLength(80) displayName!: string;
  @IsOptional() @IsString() @MaxLength(30) instagramUsername?: string;
  @IsString() @MinLength(1) @MaxLength(100) collegeId!: string;
  @IsIn(VIBE_INTENTS) primaryIntent!: (typeof VIBE_INTENTS)[number];
  @IsOptional() @IsIn(VIBE_INTENTS) secondaryIntent?: (typeof VIBE_INTENTS)[number];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests?: string[];
  @IsBoolean() ageConfirmed!: boolean;
}
export class AnswerDto {
  @IsString() @MinLength(1) @MaxLength(100) optionId!: string;
  @IsString() @MinLength(8) @MaxLength(100) idempotencyKey!: string;
}

export class BlockMatchDto {
  @IsString() @MinLength(36) @MaxLength(64) matchKey!: string;
}
