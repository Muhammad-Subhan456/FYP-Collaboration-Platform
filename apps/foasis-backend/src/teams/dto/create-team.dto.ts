import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(2, { message: 'Team name must be at least 2 characters' })
  @MaxLength(80, { message: 'Team name must be at most 80 characters' })
  name!: string;

  @IsString()
  @MinLength(2, { message: 'Domain must be at least 2 characters' })
  @MaxLength(80, { message: 'Domain must be at most 80 characters' })
  domain!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Project title must be at most 200 characters' })
  projectTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Project abstract must be at most 2000 characters',
  })
  projectAbstract?: string;

  @IsInt({ message: 'Team size must be a whole number' })
  @Min(1, { message: 'Team size must be between 1 and 4 members' })
  @Max(4, { message: 'Team size must be between 1 and 4 members' })
  maxMembers!: number;
}
