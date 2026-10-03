import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export enum GarbaPostCategory {
  PARTNER = 'PARTNER',
  GROUP = 'GROUP',
  FRIENDS = 'FRIENDS',
  EVENT = 'EVENT',
  PRACTICE = 'PRACTICE',
  GENERAL = 'GENERAL',
}

export class CreateGarbaPostDto {
  @IsEnum(GarbaPostCategory) category!: GarbaPostCategory;
  @IsString() @Length(10, 2000) content!: string;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && !value.trim() ? undefined : value))
  @IsISO8601()
  eventDate?: string;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && !value.trim() ? undefined : value))
  @IsString()
  @MaxLength(160)
  location?: string;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && !value.trim() ? undefined : value))
  @IsString()
  @MaxLength(30)
  instagramHandle?: string;
}

export class CreateGarbaCommentDto {
  @IsString() @Length(1, 500) content!: string;
  @IsOptional() @IsString() @MaxLength(80) parentId?: string;
}

export class CreateGarbaReportDto {
  @IsString() @Length(2, 40) reason!: string;
}
