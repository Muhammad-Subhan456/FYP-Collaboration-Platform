import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  create(
    @Body()
    createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(
      createNotificationDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyNotifications(
    @Req() req: any,
  ) {
    return this.notificationsService.getMyNotifications(
      req.user.userId,
    );
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id')
    id: string,
  ) {
    return this.notificationsService.markAsRead(
      id,
    );
  }
}