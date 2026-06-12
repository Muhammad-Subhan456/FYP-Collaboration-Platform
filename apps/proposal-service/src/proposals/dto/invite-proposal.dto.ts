import { IsString } from 'class-validator';

export class InviteProposalDto {
  @IsString()
  supervisorId!: string;
}