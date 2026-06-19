import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalApiKeyGuard } from '../auth/guards/internal-api-key.guard';

import { ActivityLogsService } from './activity-logs.service';

import { CreateActivityLogDto } from './dto/create-activity-log.dto';

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

  @UseGuards(InternalApiKeyGuard)
  @Post('internal')
  createInternalLog(
    @Body() dto: CreateActivityLogDto,
  ) {
    return this.activityLogsService.logActivity(
      dto.authUserId,
      dto.title,
      dto.description,
    );
  }
}
