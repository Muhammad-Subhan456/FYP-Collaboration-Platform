import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateWorkspaceSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Team size must be at least 1' })
  teamMaxMembers!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Supervisor teams limit must be at least 1' })
  supervisorMaxTeams!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Expiry time must be at least 1 hour' })
  supervisorRequestExpiryHours!: number;
}
