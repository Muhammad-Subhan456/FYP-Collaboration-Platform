import { IsEnum } from 'class-validator';

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class UpdateMilestoneStatusDto {
  @IsEnum(MilestoneStatus)
  status!: MilestoneStatus;
}
