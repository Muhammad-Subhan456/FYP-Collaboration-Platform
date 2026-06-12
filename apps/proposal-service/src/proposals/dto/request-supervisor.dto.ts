import { IsString } from 'class-validator';

export class RequestSupervisorDto {
  @IsString()
  supervisorId!: string;
}