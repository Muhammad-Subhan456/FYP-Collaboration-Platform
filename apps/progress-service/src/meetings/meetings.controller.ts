import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService:
      MeetingsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('my')
  getMyMeetings(@Req() req: any) {
    return this.meetingsService
      .getMyMeetings(
        req.user.userId,
      );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('for-my-team')
  getForMyTeam(
    @Headers('authorization') authorization: string,
  ) {
    return this.meetingsService
      .getForMyTeam(authorization);
  }
}
