import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class RemindEvaluatorsDto {
  @IsUUID()
  submissionId!: string;

  /** When omitted, all pending evaluators for the submission are reminded. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  evaluatorIds?: string[];
}
