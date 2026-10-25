import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BawalBoxQuestionStatus, BawalBoxResponseStatus } from '@prisma/client';

export class CreateBawalBoxResponseDto {
  @IsString() @MinLength(2) @MaxLength(2000) content!: string;
}

export class UpdateBawalBoxSettingsDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) brandName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) tagline?: string;
  @IsOptional() @IsString() @MaxLength(300) shortDescription?: string;
  @IsOptional() @IsString() @MaxLength(1000) longDescription?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(20) accentColor?: string;
  @IsOptional() @IsString() @MaxLength(160) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) seoDescription?: string;
  @IsOptional() @IsString() @MaxLength(160) socialTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) socialDescription?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) socialImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(160) homepageTeaserTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) homepageTeaserDescription?: string;
  @IsOptional() @IsString() @MaxLength(80) homepageTeaserCta?: string;
  @IsOptional() @IsString() @MaxLength(80) navLabel?: string;
  @IsOptional() @IsBoolean() navVisible?: boolean;
  @IsOptional() @IsBoolean() teaserVisible?: boolean;
  @IsOptional() @IsString() @MaxLength(160) introTitle?: string;
  @IsOptional() @IsString() @MaxLength(500) introDescription?: string;
  @IsOptional() @IsString() @MaxLength(80) introCta?: string;
  @IsOptional() @IsBoolean() archivedVisible?: boolean;
  @IsOptional() @IsString() @MaxLength(240) emptyStateText?: string;
  @IsOptional() @IsBoolean() heroEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(160) heroHeading?: string;
  @IsOptional() @IsString() @MaxLength(240) heroSubtitle?: string;
  @IsOptional() @IsString() @MaxLength(160) heroTagline?: string;
  @IsOptional() @IsString() @MaxLength(80) heroCtaLabel?: string;
  @IsOptional() @IsString() @MaxLength(200) heroCtaUrl?: string;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  heroDesktopImageUrl?: string;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  heroMobileImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(200) heroAltText?: string;
}

export class CreateBawalBoxQuestionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(500) instructions?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsISO8601() startAt?: string;
  @IsOptional() @IsISO8601() endAt?: string;
  @IsOptional() @IsEnum(BawalBoxQuestionStatus) status?: BawalBoxQuestionStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) answerLimit?: number;
}

export class UpdateBawalBoxQuestionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsString() @MaxLength(500) instructions?: string | null;
  @IsOptional() @IsString() @MaxLength(80) category?: string | null;
  @IsOptional() @IsISO8601() startAt?: string | null;
  @IsOptional() @IsISO8601() endAt?: string | null;
  @IsOptional() @IsEnum(BawalBoxQuestionStatus) status?: BawalBoxQuestionStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsInt()
  @Min(1)
  @Max(10000)
  answerLimit?: number | null;
}

export class BawalBoxQuestionQueryDto {
  @IsOptional() @IsEnum(BawalBoxQuestionStatus) status?: BawalBoxQuestionStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

export class ModerateBawalBoxResponseDto {
  @IsEnum(BawalBoxResponseStatus) status!: BawalBoxResponseStatus;
  @IsOptional() @IsBoolean() pinned?: boolean;
}
