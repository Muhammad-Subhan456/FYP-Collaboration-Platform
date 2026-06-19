import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Department } from './department.enum';

export class CreateSupervisorProfileDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsString()
  facultyId!: string;

  @IsEnum(Department)
  department!: Department;

  @IsString()
  designation!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  researchAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  publications?: string[];

  @IsOptional()
  @IsString()
  officeLocation?: string;

  @IsOptional()
  @IsString()
  officeHours?: string;

  @IsOptional()
  @IsString()
  linkedIn?: string;

  @IsOptional()
  @IsString()
  googleScholar?: string;

  @IsOptional()
  @IsString()
  biography?: string;
}
