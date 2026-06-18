import {
  IsOptional,
  IsString,
} from 'class-validator';

export class AssignTeamDto {
  @IsString()
  teamId!: string;

  @IsOptional()
  @IsString()
  panelId?: string;
}
