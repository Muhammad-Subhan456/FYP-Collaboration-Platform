import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { securityConfig } from '../../common/security.config';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(securityConfig.passwordMinLength)
  @MaxLength(securityConfig.passwordMaxLength)
  password!: string;
}
