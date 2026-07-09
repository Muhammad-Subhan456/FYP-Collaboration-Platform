import {
  Body,
  Controller,
  Get,
  Post,
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

  @UseGuards(JwtAuthGuard)
  @Get()
  getAnnouncements(
    @Req()
    req: {
      workspaceId: string;
      user: { role: string };
    },
  ) {
    return this.globalAnnouncementsService.getAnnouncements(
      req.workspaceId,
      req.user.role,
      {
        coordinatorView: req.user.role === 'COORDINATOR',
      },
    );
  }
}
