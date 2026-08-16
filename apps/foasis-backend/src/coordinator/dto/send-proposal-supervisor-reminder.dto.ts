import { IsDateString, IsString, MinLength } from 'class-validator';

export class SendProposalSupervisorReminderDto {
  @IsString()
  @MinLength(1)
  proposalId!: string;

  /** Coordinator-specified deadline for supervisor selection (ISO date). */
  @IsDateString()
  deadline!: string;
}
