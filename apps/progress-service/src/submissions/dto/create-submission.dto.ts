import {
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  deliverableId!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
