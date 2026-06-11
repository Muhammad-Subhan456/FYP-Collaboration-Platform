import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export enum Department {
  CS = 'CS',
  SE = 'SE',
  IT = 'IT',
  AI = 'AI',
  DS = 'DS',
}

export class CreateProfileDto {
  @IsString()
  authUserId!: string;

  @IsString()
  fullName!: string;

  @IsEnum(Department)
  department!: Department;

  @IsInt()
  semester!: number;

  @IsArray()
  skills!: string[];

  @IsArray()
  interests!: string[];

  @IsString()
  bio?: string;
}