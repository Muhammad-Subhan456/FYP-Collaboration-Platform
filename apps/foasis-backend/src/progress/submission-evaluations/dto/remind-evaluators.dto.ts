import { IsUUID } from 'class-validator';

export class RemindEvaluatorsDto {
  @IsUUID()
  submissionId!: string;
}
