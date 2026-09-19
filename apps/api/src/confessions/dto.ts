import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { appConfig } from '@ggv/config';
import { confessionCategories } from '@ggv/types';

export class CreateConfessionDto {
  @IsString()
  @MaxLength(appConfig.maxConfessionLength)
  content!: string;

  @IsOptional()
  @IsEnum(confessionCategories)
  category?: (typeof confessionCategories)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  themeId?: string;
}

export class ListConfessionsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  page = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 12;
}
