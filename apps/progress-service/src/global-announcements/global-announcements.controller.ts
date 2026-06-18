import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { GlobalAnnouncementsService } from './global-announcements.service';

import { CreateGlobalAnnouncementDto } from './dto/create-global-announcement.dto';
import { Roles } from '../auth/decorators/roles.decorator';

import { RolesGuard } from '../auth/guards/roles.guard';

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
    @Req() req: any,
    @Body()
    dto: CreateGlobalAnnouncementDto,
  ) {
    return this.globalAnnouncementsService
      .createAnnouncement(
        req.user.userId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getAnnouncements() {
    return this.globalAnnouncementsService
      .getAnnouncements();
  }
}
