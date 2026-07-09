import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../common/helpers/pagination';

export class GetFinalizedSubmissionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsIn(['finalizedAt', 'deliverable', 'team', 'supervisor'])
  sortBy?: 'finalizedAt' | 'deliverable' | 'team' | 'supervisor';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
