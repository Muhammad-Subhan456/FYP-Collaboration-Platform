import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { securityConfig } from '../../common/security.config';

export class AcceptInvitationDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @IsString()
  @MinLength(securityConfig.passwordMinLength)
  @MaxLength(securityConfig.passwordMaxLength)
  password!: string;
}
