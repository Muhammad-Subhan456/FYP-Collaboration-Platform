import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateDeliverableDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
