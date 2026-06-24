import {
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateActivityLogDto {
  @IsString()
  authUserId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
