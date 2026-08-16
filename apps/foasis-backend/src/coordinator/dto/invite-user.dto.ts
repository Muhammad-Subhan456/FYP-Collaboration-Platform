import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

import { Department } from '../../users/dto/department.enum';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  batch?: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  degreeProgram?: string;
}
