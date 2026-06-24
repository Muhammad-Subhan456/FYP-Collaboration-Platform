import { IsString, MinLength } from 'class-validator';

export class RejectProposalDto {
  @IsString()
  @MinLength(10, {
    message: 'Please provide detailed review feedback (at least 10 characters)',
  })
  reason!: string;
}
