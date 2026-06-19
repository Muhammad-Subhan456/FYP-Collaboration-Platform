import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Department } from './department.enum';

export class CreateStudentProfileDto {
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
  registrationNumber!: string;

  @IsEnum(Department)
  department!: Department;

  @IsString()
  batch!: string;

  @IsString()
  degreeProgram!: string;

  @IsInt()
  semester!: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];

  @IsOptional()
  @IsString()
  linkedIn?: string;

  @IsOptional()
  @IsString()
  github?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
