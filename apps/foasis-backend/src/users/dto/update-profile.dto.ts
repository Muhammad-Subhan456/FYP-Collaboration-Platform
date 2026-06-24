import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export enum Department {
  CS = 'CS',
  SE = 'SE',
  IT = 'IT',
  AI = 'AI',
  DS = 'DS',
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsInt()
  semester?: number;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsArray()
  interests?: string[];

  @IsOptional()
  @IsString()
  bio?: string;
}