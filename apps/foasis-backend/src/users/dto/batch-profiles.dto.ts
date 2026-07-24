import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';

import { securityConfig } from '../../common/security.config';

export class BatchProfilesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(securityConfig.profilesBatchMaxIds)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  authUserIds!: string[];
}
