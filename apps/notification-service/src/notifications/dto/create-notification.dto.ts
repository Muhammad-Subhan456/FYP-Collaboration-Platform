import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  authUserId!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  route?: string;
}
