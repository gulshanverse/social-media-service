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
} from 'class-validator';
import { ConfessionCategory } from '@prisma/client';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) @MaxLength(200) password!: string;
}
export class UpdateConfessionDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(1000)
  content?: string;
  @IsOptional() @IsEnum(ConfessionCategory) category?: ConfessionCategory;
  @IsOptional() @IsString() @MaxLength(100) themeId?: string;
}
export class CreateThemeDto {
  @IsString() @MinLength(1) @MaxLength(80) slug!: string;
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsString() @MaxLength(200) background!: string;
  @IsString() @MaxLength(500) gradient!: string;
  @IsString() @MaxLength(100) textColor!: string;
  @IsString() @MaxLength(100) accentColor!: string;
  @IsString() @MaxLength(120) fontFamily!: string;
  @IsInt() @Min(0) @Max(100) radius!: number;
}
export class UpdateThemeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(200) background?: string;
  @IsOptional() @IsString() @MaxLength(500) gradient?: string;
  @IsOptional() @IsString() @MaxLength(100) textColor?: string;
  @IsOptional() @IsString() @MaxLength(100) accentColor?: string;
  @IsOptional() @IsString() @MaxLength(120) fontFamily?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) radius?: number;
}
export class RefreshDto {}
export class ListQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) limit = 20;
}
