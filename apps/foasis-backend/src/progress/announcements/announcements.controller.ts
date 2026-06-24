import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly announcementsService:
      AnnouncementsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('my')
  getMyAnnouncements(@Req() req: any) {
    return this.announcementsService
      .getMyAnnouncements(
        req.user.userId,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('for-my-team')
  getForMyTeam(
    @Headers('authorization') authorization: string,
  ) {
    return this.announcementsService
      .getForMyTeam(authorization);
  }
}
