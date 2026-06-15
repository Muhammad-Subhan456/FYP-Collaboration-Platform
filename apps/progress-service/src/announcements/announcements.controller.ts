import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AnnouncementsService } from './announcements.service';

import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly announcementsService:
      AnnouncementsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createAnnouncement(
    @Req() req: any,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService
      .createAnnouncement(
        req.user.userId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyAnnouncements(
    @Req() req: any,
  ) {
    return this.announcementsService
      .getMyAnnouncements(
        req.user.userId,
      );
  }
}