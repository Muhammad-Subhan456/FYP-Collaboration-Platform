import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResubmitProposalDto {
  @IsString()
  @MinLength(5)
  title!: string;

  @IsString()
  @MinLength(2)
  domain!: string;

  @IsString()
  @MinLength(20)
  abstract!: string;

  @IsOptional()
  @IsString()
  proposalPdfUrl?: string;
}
