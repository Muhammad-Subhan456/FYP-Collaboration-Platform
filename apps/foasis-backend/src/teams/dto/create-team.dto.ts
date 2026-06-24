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
  description?: string;

  @IsInt()
  @Min(2)
  maxMembers!: number;
}