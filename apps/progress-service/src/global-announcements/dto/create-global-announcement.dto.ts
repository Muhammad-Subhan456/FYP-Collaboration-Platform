import {
  IsString,
} from 'class-validator';

export class CreateGlobalAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;
}