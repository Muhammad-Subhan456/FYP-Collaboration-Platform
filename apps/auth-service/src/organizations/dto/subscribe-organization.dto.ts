import { IsEnum, IsString, MinLength } from 'class-validator';

export class SubscribeOrganizationDto {
  @IsString()
  @MinLength(2)
  organizationName!: string;

  @IsEnum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
  plan!: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
}
