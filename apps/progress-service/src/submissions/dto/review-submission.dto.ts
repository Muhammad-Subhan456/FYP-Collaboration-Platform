import {
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class ReviewSubmissionDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsInt()
  grade?: number;
}