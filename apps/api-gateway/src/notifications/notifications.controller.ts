import {
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GatewayHttpService } from '../common/gateway-http.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyNotifications(
    @Headers('authorization') authorization: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/me`,
      authorization,
      { page, limit },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  getUnreadCount(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/unread-count`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  markAllAsRead(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.patch(
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/read-all`,
      {},
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markAsRead(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.gatewayHttpService.patch(
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/${id}/read`,
      {},
      authorization,
    );
  }
}
