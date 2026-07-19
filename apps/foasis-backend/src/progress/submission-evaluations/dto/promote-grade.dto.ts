import { IsString } from 'class-validator';

export class PromoteGradeDto {
  @IsString()
  phaseId!: string;

  @IsString()
  studentId!: string;
}
