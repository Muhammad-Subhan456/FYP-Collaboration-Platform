import { IsString } from 'class-validator';

export class AssignSupervisorEvaluatorDto {
  @IsString()
  submissionId!: string;
}
