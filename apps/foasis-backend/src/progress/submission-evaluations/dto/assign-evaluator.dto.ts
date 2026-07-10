import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignEvaluatorDto {
  @IsString()
  submissionId!: string;

  @IsString()
  evaluatorId!: string;
}

export class AssignEvaluatorsDto {
  @IsString()
  submissionId!: string;

  @IsArray()
  @IsString({ each: true })
  evaluatorIds!: string[];
}

export class CriterionScoreDto {
  @IsString()
  rubricCriterionId!: string;

  @IsNumber()
  @Min(0)
  marksAwarded!: number;
}

export class StudentScoreDto {
  @IsString()
  studentId!: string;

  @IsNumber()
  @Min(0)
  totalMarks!: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionScoreDto)
  criterionScores!: CriterionScoreDto[];
}

export class SaveEvaluationDraftDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentScoreDto)
  studentScores!: StudentScoreDto[];
}
