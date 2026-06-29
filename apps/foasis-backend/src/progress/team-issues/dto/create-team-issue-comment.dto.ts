import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTeamIssueCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
