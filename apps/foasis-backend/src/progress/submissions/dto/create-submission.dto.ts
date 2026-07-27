import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { WorkStreamAttachmentDto } from '../../work-stream/dto/work-stream-attachment.dto';

export class CreateSubmissionDto {
  @IsString()
  deliverableId!: string;

  /** Primary/legacy file URL (first attachment). Required for backward compatibility. */
  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkStreamAttachmentDto)
  attachments?: WorkStreamAttachmentDto[];

  @IsOptional()
  @IsString()
  remarks?: string;
}
