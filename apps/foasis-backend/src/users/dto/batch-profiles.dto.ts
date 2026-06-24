import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class BatchProfilesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  authUserIds!: string[];
}
