import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ActivityLogsService } from './activity-logs.service';

import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(
    private readonly activityLogsService:
      ActivityLogsService,
  ) {}

  @Post()
  createLog(
    @Body()
    dto: CreateActivityLogDto,
  ) {
    return this.activityLogsService
      .createLog(dto);
  }

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