import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  @IsString()
  dueDate!: string;

  @IsInt()
  @Min(1)
  totalMarks!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weightagePercent?: number;

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
