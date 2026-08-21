import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { GlobalAnnouncementsService } from './global-announcements.service';

import { CreateGlobalAnnouncementDto } from './dto/create-global-announcement.dto';
import { Roles } from '../../common/decorators/roles.decorator';

import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('global-announcements')
export class GlobalAnnouncementsController {
  constructor(
    private readonly globalAnnouncementsService:
      GlobalAnnouncementsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Post()
  createAnnouncement(
    @Req() req: { user: { userId: string }; workspaceId: string },
    @Body()
    dto: CreateGlobalAnnouncementDto,
  ) {
    return this.globalAnnouncementsService
      .createAnnouncement(
        req.user.userId,
        dto,
        req.workspaceId,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'SUPERVISOR', 'COORDINATOR', 'EVALUATOR')
  @Get()
  getAnnouncements(
    @Req()
    req: {
      workspaceId: string;
      user: { role: string; userId: string };
    },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum =
      page !== undefined && page !== ''
        ? Number(page)
        : undefined;
    const limitNum =
      limit !== undefined && limit !== ''
        ? Number(limit)
        : undefined;

    return this.globalAnnouncementsService.getAnnouncements(
      req.workspaceId,
      req.user.role,
      {
        coordinatorView: req.user.role === 'COORDINATOR',
        viewerUserId: req.user.userId,
        ...(pageNum != null || limitNum != null
          ? {
              page: Number.isFinite(pageNum) ? pageNum : 1,
              limit: Number.isFinite(limitNum) ? limitNum : 6,
            }
          : {}),
      },
    );
  }
}
