import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Department } from './department.enum';

export class CreateStudentProfileDto {
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name must be at most 100 characters' })
  fullName!: string;

  /** Ignored in favor of the authenticated account email. */
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profilePicture?: string;

  @IsString()
  @MinLength(1, { message: 'Registration number is required' })
  @MaxLength(50, {
    message: 'Registration number must be at most 50 characters',
  })
  registrationNumber!: string;

  @IsEnum(Department, { message: 'Select a valid department' })
  department!: Department;

  @IsString()
  @MinLength(1, { message: 'Batch is required' })
  @MaxLength(30, { message: 'Batch must be at most 30 characters' })
  batch!: string;

  @IsString()
  @MinLength(1, { message: 'Degree program is required' })
  @MaxLength(100, {
    message: 'Degree program must be at most 100 characters',
  })
  degreeProgram!: string;

  @IsInt({ message: 'Semester must be a whole number' })
  @Min(1, { message: 'Semester must be between 1 and 12' })
  @Max(12, { message: 'Semester must be between 1 and 12' })
  semester!: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'CGPA must be a number with up to 2 decimal places' },
  )
  @Min(0, { message: 'CGPA must be between 0.00 and 4.00' })
  @Max(4, { message: 'CGPA must be between 0.00 and 4.00' })
  cgpa?: number;

  @IsOptional()
  @ValidateIf((_, value) => typeof value === 'string' && value.length > 0)
  @IsString()
  @Matches(/^[+]?[0-9\s()-]{7,20}$/, {
    message: 'Enter a valid phone number',
  })
  phone?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30, { message: 'Add at most 30 skills' })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30, { message: 'Add at most 30 interests' })
  @IsOptional()
  interests?: string[];

  @IsOptional()
  @ValidateIf((_, value) => typeof value === 'string' && value.length > 0)
  @IsString()
  @MaxLength(300, { message: 'LinkedIn URL is too long' })
  @IsUrl(
    { require_protocol: true },
    { message: 'LinkedIn must be a valid URL (https://...)' },
  )
  linkedIn?: string;

  @IsOptional()
  @ValidateIf((_, value) => typeof value === 'string' && value.length > 0)
  @IsString()
  @MaxLength(300, { message: 'GitHub URL is too long' })
  @IsUrl(
    { require_protocol: true },
    { message: 'GitHub must be a valid URL (https://...)' },
  )
  github?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Bio must be at most 1000 characters' })
  bio?: string;
}
