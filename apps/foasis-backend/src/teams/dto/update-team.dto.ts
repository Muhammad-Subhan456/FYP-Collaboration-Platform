import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  domain!: string;

  @IsOptional()
  @IsString()
  projectTitle?: string;

  @IsOptional()
  @IsString()
  projectAbstract?: string;
}
