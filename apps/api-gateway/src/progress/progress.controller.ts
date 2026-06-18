import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GatewayHttpService } from '../common/gateway-http.service';

@Controller()
export class ProgressController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  private progressUrl(path: string) {
    return `${process.env.PROGRESS_SERVICE_URL}${path}`;
  }

  @UseGuards(JwtAuthGuard)
  @Post('deliverables')
  createDeliverable(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/deliverables'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('deliverables/my')
  getMyDeliverables(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/deliverables/my'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('deliverables/for-my-team')
  getDeliverablesForMyTeam(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/deliverables/for-my-team'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('deliverables/:id')
  updateDeliverable(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      this.progressUrl(`/deliverables/${id}`),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('submissions')
  createSubmission(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/submissions'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/my')
  getMySubmissions(
    @Headers('authorization') authorization: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/submissions/my'),
      authorization,
      { page, limit },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/deliverable/:id')
  getDeliverableSubmissions(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(`/submissions/deliverable/${id}`),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('submissions/:id/review')
  reviewSubmission(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      this.progressUrl(`/submissions/${id}/review`),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/:deliverableId/team/:teamId/latest')
  getLatestSubmission(
    @Headers('authorization') authorization: string,
    @Param('deliverableId') deliverableId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(
        `/submissions/${deliverableId}/team/${teamId}/latest`,
      ),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/:deliverableId/team/:teamId/history')
  getSubmissionHistory(
    @Headers('authorization') authorization: string,
    @Param('deliverableId') deliverableId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(
        `/submissions/${deliverableId}/team/${teamId}/history`,
      ),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/team/:teamId')
  getTeamSubmissions(
    @Headers('authorization') authorization: string,
    @Param('teamId') teamId: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(`/submissions/team/${teamId}`),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('evaluations')
  createEvaluation(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/evaluations'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('evaluations')
  getAllEvaluations(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/evaluations'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('evaluations/my')
  getMyEvaluations(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/evaluations/my'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('evaluations/:id/assign-team')
  assignTeam(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl(`/evaluations/${id}/assign-team`),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('evaluations/team/:teamId')
  getTeamEvaluations(
    @Headers('authorization') authorization: string,
    @Param('teamId') teamId: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(`/evaluations/team/${teamId}`),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('evaluation-results/:evaluationId')
  createResult(
    @Headers('authorization') authorization: string,
    @Param('evaluationId') evaluationId: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl(`/evaluation-results/${evaluationId}`),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('evaluation-results/my')
  getMyResults(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/evaluation-results/my'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('evaluation-results/team/:teamId')
  getResultsForTeam(
    @Headers('authorization') authorization: string,
    @Param('teamId') teamId: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(`/evaluation-results/team/${teamId}`),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('global-announcements')
  createGlobalAnnouncement(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/global-announcements'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('global-announcements')
  getGlobalAnnouncements(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/global-announcements'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('announcements')
  createAnnouncement(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/announcements'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('announcements/my')
  getMyAnnouncements(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/announcements/my'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('announcements/for-my-team')
  getAnnouncementsForMyTeam(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/announcements/for-my-team'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('meetings')
  createMeeting(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/meetings'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('meetings/my')
  getMyMeetings(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/meetings/my'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('meetings/for-my-team')
  getMeetingsForMyTeam(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/meetings/for-my-team'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('milestones')
  createMilestone(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/milestones'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('milestones/:proposalId')
  getMilestones(
    @Headers('authorization') authorization: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(`/milestones/${proposalId}`),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('milestones/:id/status')
  updateMilestoneStatus(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      this.progressUrl(`/milestones/${id}/status`),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('tasks')
  createTask(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/tasks'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('tasks/my')
  getMyTasks(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/tasks/my'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('tasks/milestone/:id')
  getMilestoneTasks(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(`/tasks/milestone/${id}`),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tasks/:id/status')
  updateTaskStatus(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      this.progressUrl(`/tasks/${id}/status`),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('activity-logs/my')
  getMyActivityLogs(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/activity-logs/my'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats/coordinator')
  getCoordinatorStats(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/stats/coordinator'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats/supervisor')
  getSupervisorStats(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/stats/supervisor'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats/student')
  getStudentStats(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/stats/student'),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('evaluation-panels')
  createEvaluationPanel(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl('/evaluation-panels'),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('evaluation-panels/:id/evaluators')
  addPanelEvaluator(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      this.progressUrl(`/evaluation-panels/${id}/evaluators`),
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('evaluation-panels/evaluation/:evaluationId')
  getPanelsForEvaluation(
    @Headers('authorization') authorization: string,
    @Param('evaluationId') evaluationId: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl(
        `/evaluation-panels/evaluation/${evaluationId}`,
      ),
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('evaluation-panels/my')
  getMyPanels(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      this.progressUrl('/evaluation-panels/my'),
      authorization,
    );
  }
}
