import {
  IsString,
} from 'class-validator';

export class UpdateTaskStatusDto {
  @IsString()
  status!: string;
}