import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';

import { CreateNotificationDto } from './create-notification.dto';

export class CreateBulkNotificationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationDto)
  notifications!: CreateNotificationDto[];
}
