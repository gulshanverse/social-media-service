import { HomepagePromotionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHomepagePromotionDto {
  @IsString() @MinLength(1) @MaxLength(120) title!: string;
  @IsString() @MinLength(1) @MaxLength(2048) desktopImageUrl!: string;
  @IsString() @MinLength(1) @MaxLength(512) desktopImageKey!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsString() @MaxLength(80) badgeText?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) mobileImageUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(512) mobileImageKey?: string | null;
  @IsOptional() @IsString() @MaxLength(300) imageAlt?: string | null;
  @IsOptional() @IsString() @MaxLength(60) ctaLabel?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) destinationUrl?: string | null;
  @IsOptional() @IsEnum(HomepagePromotionStatus) status?: HomepagePromotionStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(-10000) @Max(10000) priority?: number;
  @IsOptional() @IsDateString() startAt?: string | null;
  @IsOptional() @IsDateString() endAt?: string | null;
}

export class UpdateHomepagePromotionDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsString() @MaxLength(80) badgeText?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) desktopImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(512) desktopImageKey?: string;
  @IsOptional() @IsString() @MaxLength(2048) mobileImageUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(512) mobileImageKey?: string | null;
  @IsOptional() @IsString() @MaxLength(300) imageAlt?: string | null;
  @IsOptional() @IsString() @MaxLength(60) ctaLabel?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) destinationUrl?: string | null;
  @IsOptional() @IsEnum(HomepagePromotionStatus) status?: HomepagePromotionStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(-10000) @Max(10000) priority?: number;
  @IsOptional() @IsDateString() startAt?: string | null;
  @IsOptional() @IsDateString() endAt?: string | null;
}

export class HomepagePromotionsListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}

export class ReorderHomepagePromotionsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsString({ each: true }) ids!: string[];
}
