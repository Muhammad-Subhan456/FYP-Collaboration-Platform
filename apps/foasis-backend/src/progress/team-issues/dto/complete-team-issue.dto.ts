import { IsOptional, IsString } from 'class-validator';

export class CompleteTeamIssueDto {
  @IsString()
  @IsOptional()
  githubPrUrl?: string;

  @IsString()
  @IsOptional()
  githubCommitUrl?: string;
}
