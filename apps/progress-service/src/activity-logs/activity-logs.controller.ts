import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ActivityLogsService } from './activity-logs.service';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(
    private readonly activityLogsService:
      ActivityLogsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyLogs(
    @Req() req: any,
  ) {
    return this.activityLogsService
      .getMyLogs(
        req.user.userId,
      );
  }
}
