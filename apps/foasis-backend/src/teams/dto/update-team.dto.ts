import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  domain!: string;

  @IsString()
  @MinLength(5)
  projectTitle!: string;

  @IsString()
  @MinLength(20)
  projectAbstract!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  proposalPdfUrl?: string | null;
}
