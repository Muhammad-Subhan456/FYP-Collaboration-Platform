import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsQueryDto } from '../notifications/dto/notifications-query.dto';

import { StudentPagesService } from './student-pages.service';

type StudentRequest = {
  user: { userId: string };
  workspaceId: string;
};

@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class StudentController {
  constructor(
    private readonly studentPagesService: StudentPagesService,
  ) {}

  @Get('dashboard')
  getDashboard(@Req() req: StudentRequest) {
    return this.studentPagesService.getDashboard(
      req.user.userId,
      req.workspaceId,
    );
  }

  @Get('team')
  getTeam(@Req() req: StudentRequest) {
    return this.studentPagesService.getTeam(
      req.user.userId,
      req.workspaceId,
    );
  }

  @Get('work-stream')
  getWorkStream(
    @Req() req: { user: { userId: string } },
    @Query('phaseId') phaseId?: string,
  ) {
    return this.studentPagesService.getWorkStream(
      req.user.userId,
      phaseId,
    );
  }

  @Get('deliverables')
  getDeliverables(@Req() req: { user: { userId: string } }) {
    return this.studentPagesService.getDeliverables(
      req.user.userId,
    );
  }

  @Get('submissions')
  getSubmissions(@Req() req: { user: { userId: string } }) {
    return this.studentPagesService.getSubmissions(
      req.user.userId,
    );
  }

  @Get('announcements')
  getAnnouncements(@Req() req: { user: { userId: string } }) {
    return this.studentPagesService.getAnnouncements(
      req.user.userId,
    );
  }

  @Get('milestones')
  getMilestones(@Req() req: { user: { userId: string } }) {
    return this.studentPagesService.getMilestones(
      req.user.userId,
    );
  }

  @Get('evaluations')
  getEvaluations(
    @Req() req: { user: { userId: string }; workspaceId: string },
  ) {
    return this.studentPagesService.getEvaluations(
      req.user.userId,
      req.workspaceId,
    );
  }

  @Get('results')
  getResults(@Req() req: { user: { userId: string } }) {
    return this.studentPagesService.getResults(
      req.user.userId,
    );
  }

  @Get('notifications')
  getNotifications(
    @Req() req: { user: { userId: string } },
    @Query() query: NotificationsQueryDto,
  ) {
    return this.studentPagesService.getNotifications(
      req.user.userId,
      query.page,
      query.limit,
      query.isRead,
    );
  }

  @Get('profile')
  getProfile(@Req() req: { user: { userId: string } }) {
    return this.studentPagesService.getProfile(
      req.user.userId,
    );
  }

  @Get('proposal')
  getProposal(@Req() req: StudentRequest) {
    return this.studentPagesService.getProposal(
      req.user.userId,
      req.workspaceId,
    );
  }
}
