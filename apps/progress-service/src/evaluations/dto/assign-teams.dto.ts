import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class AssignTeamsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  teamIds!: string[];

  @IsOptional()
  @IsString()
  panelId?: string;
}
