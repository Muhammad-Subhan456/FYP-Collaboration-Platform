import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export enum DeliverableType {
  SRS = 'SRS',
  DESIGN = 'DESIGN',
  MID_VIVA = 'MID_VIVA',
  FINAL_REPORT = 'FINAL_REPORT',
  PRESENTATION = 'PRESENTATION',
  OTHER = 'OTHER',
}

export class CreateDeliverableDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(DeliverableType)
  type!: DeliverableType;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}