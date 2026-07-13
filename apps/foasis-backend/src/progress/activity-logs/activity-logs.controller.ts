import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';

import { ActivityLogsService } from './activity-logs.service';

import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(
    private readonly activityLogsService:
      ActivityLogsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'SUPERVISOR', 'COORDINATOR', 'EVALUATOR')
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
