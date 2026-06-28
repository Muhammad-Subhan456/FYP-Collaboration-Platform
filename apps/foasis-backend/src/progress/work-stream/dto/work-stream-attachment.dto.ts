import { IsString } from 'class-validator';

export class WorkStreamAttachmentDto {
  @IsString()
  fileUrl!: string;

  @IsString()
  fileName!: string;
}
