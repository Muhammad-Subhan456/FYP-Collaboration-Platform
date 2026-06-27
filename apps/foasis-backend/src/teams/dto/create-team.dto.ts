import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name!: string;

  @IsString()
  domain!: string;

  @IsOptional()
  @IsString()
  projectTitle?: string;

  @IsOptional()
  @IsString()
  projectAbstract?: string;

  @IsInt()
  @Min(2)
  maxMembers!: number;
}
