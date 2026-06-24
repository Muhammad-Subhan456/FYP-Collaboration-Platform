import {
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  IsOptional,
} from 'class-validator';

export enum Department {
  CS = 'CS',
  SE = 'SE',
  IT = 'IT',
  AI = 'AI',
  DS = 'DS',
}

export class CreateOwnProfileDto {
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

  @IsOptional()
  @IsString()
  bio?: string;
}