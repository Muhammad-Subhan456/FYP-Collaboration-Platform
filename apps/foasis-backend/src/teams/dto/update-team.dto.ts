import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ProjectNature } from '@prisma/client';

import {
  MAX_PROJECT_DOMAINS,
  PROJECT_DOMAINS,
} from '../../proposals/proposal-constants';

export class UpdateTeamDto {
  @IsString()
  @MinLength(2)
  name!: string;

  /** Legacy free-text domain — derived from `domains` when omitted. */
  @IsOptional()
  @IsString()
  domain?: string;

  @IsString()
  @MinLength(5)
  projectTitle!: string;

  @IsString()
  @MinLength(1)
  projectAbstract!: string;

  @IsOptional()
  @IsEnum(ProjectNature, { message: 'Select a valid project nature' })
  nature?: ProjectNature;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PROJECT_DOMAINS)
  @IsString({ each: true })
  @IsIn(PROJECT_DOMAINS as unknown as string[], {
    each: true,
    message: 'Invalid project domain selected',
  })
  domains?: string[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(150, { message: 'Other domain must be at most 150 characters' })
  otherDomain?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(17)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(17, { each: true })
  sdgs?: number[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  sdgJustification?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  previousObjectives?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  proposalPdfUrl?: string | null;
}
