import { IsEnum } from 'class-validator';

export enum UserRole {
  STUDENT = 'STUDENT',
  SUPERVISOR = 'SUPERVISOR',
  COORDINATOR = 'COORDINATOR',
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
