import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  type!: string;

  @IsDateString()
  meetingDate!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;
}