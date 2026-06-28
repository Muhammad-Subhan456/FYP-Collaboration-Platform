import { IsEnum, IsString } from 'class-validator';

import { WorkStreamEntityType } from '@prisma/client';

export class CreateWorkStreamCommentDto {
  @IsEnum(WorkStreamEntityType)
  entityType!: WorkStreamEntityType;

  @IsString()
  entityId!: string;

  @IsString()
  body!: string;
}
