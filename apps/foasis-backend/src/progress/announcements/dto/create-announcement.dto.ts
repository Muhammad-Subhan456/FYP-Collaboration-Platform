import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AnnouncementType } from '@prisma/client';
import { Type } from 'class-transformer';

import { WorkStreamAttachmentDto } from '../../work-stream/dto/work-stream-attachment.dto';

export class CreateAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'At least one team must be selected',
  })
  @IsString({ each: true })
  teamIds!: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkStreamAttachmentDto)
  attachments?: WorkStreamAttachmentDto[];
}
