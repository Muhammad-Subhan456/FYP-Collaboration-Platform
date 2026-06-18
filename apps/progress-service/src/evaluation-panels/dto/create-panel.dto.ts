import {
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePanelDto {
  @IsString()
  evaluationId!: string;

  @IsString()
  room!: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
