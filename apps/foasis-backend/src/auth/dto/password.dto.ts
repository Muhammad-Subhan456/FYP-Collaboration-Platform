import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class SelectContextDto {
  @IsString()
  selectionToken!: string;

  @IsString()
  workspaceId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

export class SwitchContextDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
