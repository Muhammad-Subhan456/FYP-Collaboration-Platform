import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { MeetingsService } from './meetings.service';

import { CreateMeetingDto } from './dto/create-meeting.dto';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService:
      MeetingsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createMeeting(
    @Req() req: any,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.meetingsService
      .createMeeting(
        req.user.userId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyMeetings(
    @Req() req: any,
  ) {
    return this.meetingsService
      .getMyMeetings(
        req.user.userId,
      );
  }
}