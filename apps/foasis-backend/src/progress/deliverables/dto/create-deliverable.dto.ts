import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { WorkStreamAttachmentDto } from '../../work-stream/dto/work-stream-attachment.dto';

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkStreamAttachmentDto)
  attachments?: WorkStreamAttachmentDto[];
}
