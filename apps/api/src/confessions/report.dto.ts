import { IsIn, IsString, MaxLength } from 'class-validator';

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
}
