import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalApiKeyGuard } from '../auth/guards/internal-api-key.guard';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../common/pagination';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(InternalApiKeyGuard)
  @Post()
  create(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(
      createNotificationDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyNotifications(
    @Req() req: any,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationsService.getMyNotifications(
      req.user.userId,
      query.page,
      query.limit,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService
      .getUnreadCount(req.user.userId)
      .then((count) => ({ count }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.notificationsService.markAsRead(
      id,
      req.user.userId,
    );
  }
}
