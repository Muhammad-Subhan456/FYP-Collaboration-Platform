import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  milestoneId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  assignedTo!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}