import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ExtendDeadlineDto {
  @IsDateString()
  newDueDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
