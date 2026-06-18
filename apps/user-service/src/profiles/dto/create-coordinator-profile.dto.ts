import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Department } from './department.enum';

export class CreateCoordinatorProfileDto {
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

  @IsOptional()
  @IsString()
  coordinatorRole?: string;

  @IsOptional()
  @IsString()
  officeLocation?: string;

  @IsOptional()
  @IsString()
  contactInformation?: string;

  @IsOptional()
  @IsString()
  biography?: string;
}
