import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { TeamIssuePriority } from '@prisma/client';

export class UpdateTeamIssueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @IsEnum(TeamIssuePriority)
  @IsOptional()
  priority?: TeamIssuePriority;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  labels?: string[];
}
