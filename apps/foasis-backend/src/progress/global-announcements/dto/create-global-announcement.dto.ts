import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnnouncementType } from '@prisma/client';

import {
  ALL_ANNOUNCEMENT_AUDIENCE_ROLES,
} from '../announcement-audience';

export class GlobalAnnouncementAttachmentDto {
  @IsString()
  fileUrl!: string;

  @IsString()
  fileName!: string;
}

export class CreateGlobalAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audienceRoles?: (typeof ALL_ANNOUNCEMENT_AUDIENCE_ROLES)[number][];

  /** ISO datetime — if in the future, announcement is scheduled. */
  @IsOptional()
  @IsString()
  publishAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GlobalAnnouncementAttachmentDto)
  attachments?: GlobalAnnouncementAttachmentDto[];
}
