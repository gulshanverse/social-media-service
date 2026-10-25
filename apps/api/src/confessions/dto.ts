import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { allConfessionCategories, confessionCategories } from '@ggv/types';

export class CreateConfessionDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsEnum(confessionCategories)
  category?: (typeof confessionCategories)[number];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40)
  customCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  themeId?: string;
}

export class ListConfessionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 12;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(allConfessionCategories)
  category?: (typeof allConfessionCategories)[number];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customCategory?: string;

  @IsOptional()
  @IsIn(['all', 'today', '7d', '30d', 'custom'])
  dateRange?: 'all' | 'today' | '7d' | '30d' | 'custom';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  endDate?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest', 'relevance'])
  sort?: 'newest' | 'oldest' | 'relevance';
}
