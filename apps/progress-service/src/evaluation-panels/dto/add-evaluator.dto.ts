import {
  IsOptional,
  IsString,
} from 'class-validator';

export class AddEvaluatorDto {
  @IsString()
  evaluatorId!: string;

  @IsOptional()
  @IsString()
  role?: string;
}
