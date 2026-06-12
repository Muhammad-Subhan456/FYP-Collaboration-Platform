import { IsString } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  teamId!: string;

  @IsString()
  title!: string;

  @IsString()
  domain!: string;

  @IsString()
  abstract!: string;
}