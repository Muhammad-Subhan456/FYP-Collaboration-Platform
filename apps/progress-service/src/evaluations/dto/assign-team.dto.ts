import {
  IsString,
} from 'class-validator';

export class AssignTeamDto {
  @IsString()
  teamId!: string;
}