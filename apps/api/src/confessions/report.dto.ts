import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const reportReasons = [
  'HARASSMENT',
  'HATE',
  'SEXUAL_CONTENT',
  'THREAT',
  'SPAM',
  'PERSONAL_INFORMATION',
  'OTHER',
] as const;

export class CreateReportDto {
  @IsString()
  @MaxLength(40)
  @IsIn(reportReasons)
  reason!: (typeof reportReasons)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
