import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  teamRole?: string;
}
