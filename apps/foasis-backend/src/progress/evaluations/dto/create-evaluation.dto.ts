import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEvaluationDto {
  @IsString()
  title!: string;

  @IsString()
  type!: string;

  @IsDateString()
  date!: string;

  @IsString()
  venue!: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}