import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeamDueDateDto {
  @IsString()
  teamId!: string;

  @IsString()
  dueDate!: string;
}

export class PublishDeliverableTemplateDto {
  @IsString()
  templateId!: string;

  @IsArray()
  @IsString({ each: true })
  teamIds!: string[];

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamDueDateDto)
  teamDueDates?: TeamDueDateDto[];
}
