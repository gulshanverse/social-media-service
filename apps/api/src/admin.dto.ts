import { plainToInstance, Transform } from 'class-transformer';
import { BadRequestException, PipeTransform } from '@nestjs/common';
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
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsUrl,
  validateSync,
} from 'class-validator';
import { ConfessionCategory, ConfessionStatus, ReportStatus } from '@prisma/client';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) @MaxLength(200) password!: string;
}
export class UpdateConfessionDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
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
export class UpdateProfileSettingsDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) handle?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) headerMessage?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) defaultPrompt?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) communityButtonText?: string;
  @IsOptional() @IsIn(['/confessions']) communityPath?: '/confessions';
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) bottomButtonText?: string;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && !value.trim() ? undefined : value))
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  profileImageUrl?: string;
  @IsOptional() @IsIn(['sunset', 'pink-flame', 'coral', 'ocean', 'midnight']) themePreset?: string;
  @IsOptional() @IsInt() @Min(100) @Max(5000) maxCharacters?: number;
  @IsOptional() @IsInt() @Min(14) @Max(20) cardTextSize?: number;
  @IsOptional() @IsInt() @Min(3) @Max(6) previewLines?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) prompts?: string[];
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
export class BulkModerationDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(100) @IsString({ each: true }) ids!: string[];
  @IsIn(['approve', 'reject', 'archive']) action!: 'approve' | 'reject' | 'archive';
}
export class BulkModerationPipe implements PipeTransform {
  transform(value: unknown) {
    const dto = plainToInstance(BulkModerationDto, value);
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) throw new BadRequestException('Invalid request.');
    return dto;
  }
}
