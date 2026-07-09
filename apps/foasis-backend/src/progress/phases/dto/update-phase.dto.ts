import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PhaseStatus } from '@prisma/client';

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  creditHours?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PhaseStatus)
  status?: PhaseStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
