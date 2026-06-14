import { IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  authUserId!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;
}