import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

import { securityConfig } from '../../common/security.config';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(securityConfig.passwordMinLength)
  @MaxLength(securityConfig.passwordMaxLength)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(securityConfig.passwordMaxLength)
  currentPassword!: string;

  @IsString()
  @MinLength(securityConfig.passwordMinLength)
  @MaxLength(securityConfig.passwordMaxLength)
  newPassword!: string;
}

export class SelectContextDto {
  @IsString()
  @MaxLength(4096)
  selectionToken!: string;

  @IsString()
  @MaxLength(64)
  workspaceId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

export class SwitchContextDto {
  @IsString()
  @MaxLength(64)
  workspaceId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
