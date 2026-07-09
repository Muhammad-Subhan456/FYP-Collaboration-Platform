import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliverableType } from '@prisma/client';

export class TemplateAttachmentDto {
  @IsString()
  fileUrl!: string;

  @IsString()
  fileName!: string;
}

export class RubricCriterionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  maxMarks!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateDeliverableTemplateDto {
  @IsString()
  phaseId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(DeliverableType)
  type!: DeliverableType;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsInt()
  @Min(1)
  totalMarks!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  rubricCriteria!: RubricCriterionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateAttachmentDto)
  attachments?: TemplateAttachmentDto[];
}
