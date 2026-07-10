import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/helpers/pagination';

export class ListEligibleSubmissionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  supervisorId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsIn(['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'])
  evaluationStatus?: string;

  @IsOptional()
  @IsString()
  evaluatorId?: string;
}

export class ListResultsQueryDto {
  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  supervisorId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  evaluatorId?: string;
}
