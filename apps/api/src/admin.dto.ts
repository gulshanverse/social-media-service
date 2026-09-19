import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsEmail,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsIn,
} from 'class-validator';
import { ConfessionCategory, ConfessionStatus, ReportStatus } from '@prisma/client';
import { appConfig } from '@ggv/config';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) @MaxLength(200) password!: string;
}
export class UpdateConfessionDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(appConfig.maxConfessionLength)
  content?: string;
  @IsOptional() @IsEnum(ConfessionCategory) category?: ConfessionCategory;
  @IsOptional() @IsString() @MaxLength(100) themeId?: string;
}
export class CreateThemeDto {
  @IsString() @MinLength(1) @MaxLength(80) slug!: string;
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsString() @MinLength(1) @MaxLength(200) background!: string;
  @IsString() @MinLength(1) @MaxLength(500) gradient!: string;
  @IsString() @MinLength(1) @MaxLength(100) textColor!: string;
  @IsString() @MinLength(1) @MaxLength(100) accentColor!: string;
  @IsString() @MinLength(1) @MaxLength(120) fontFamily!: string;
  @IsInt() @Min(0) @Max(100) radius!: number;
}
export class UpdateThemeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) background?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(500) gradient?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) textColor?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) accentColor?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) fontFamily?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) radius?: number;
}
export class RefreshDto {}
export class ListQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) limit = 20;
}
export class AdminQueueQueryDto extends ListQueryDto {
  @IsOptional() @IsEnum(ConfessionStatus) status?: ConfessionStatus;
  @IsOptional() @IsEnum(ConfessionCategory) category?: ConfessionCategory;
  @IsOptional() @IsString() @MaxLength(100) theme?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(['newest', 'oldest']) order?: 'newest' | 'oldest';
}
export class AdminReportQueryDto extends ListQueryDto {
  @IsOptional() @IsEnum(ReportStatus) status?: ReportStatus;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(['newest', 'oldest']) order?: 'newest' | 'oldest';
}
export class AdminAuditQueryDto extends ListQueryDto {
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(80) entity?: string;
}
