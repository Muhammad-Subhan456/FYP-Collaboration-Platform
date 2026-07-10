import { Injectable } from '@nestjs/common';
import { SubmissionEvaluationStatus } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { GlobalAnnouncementsService } from '../progress/global-announcements/global-announcements.service';
import { SubmissionEvaluationsService } from '../progress/submission-evaluations/submission-evaluations.service';
import { ProfilesService } from '../users/profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { getWorkspaceIdFromContext } from '../workspace/workspace-als';

@Injectable()
export class EvaluatorPagesService {
  constructor(
    private readonly submissionEvaluationsService: SubmissionEvaluationsService,
    private readonly globalAnnouncementsService: GlobalAnnouncementsService,
    private readonly notificationsService: NotificationsService,
    private readonly profilesService: ProfilesService,
    private readonly prisma: PrismaService,
  ) {}

  async getDashboard(evaluatorId: string) {
    const workspaceId = getWorkspaceIdFromContext();

    const [evaluations, notifications, globalAnnouncements] =
      await Promise.all([
        workspaceId
          ? this.submissionEvaluationsService.getMyEvaluations(
              workspaceId,
              evaluatorId,
            )
          : Promise.resolve([]),
        this.notificationsService
          .getMyNotifications(evaluatorId, 1, 5)
          .catch(() => ({
            data: [],
            total: 0,
            page: 1,
            limit: 5,
          })),
        workspaceId
          ? this.globalAnnouncementsService
              .getAnnouncements(workspaceId, 'EVALUATOR')
              .catch(() => [])
          : Promise.resolve([]),
      ]);

    const teamIds = [
      ...new Set(evaluations.map((evaluation) => evaluation.teamId)),
    ];
    const teamNameById = await this.loadTeamNameMap(teamIds);

    const pendingCount = evaluations.filter(
      (evaluation) =>
        evaluation.status !== SubmissionEvaluationStatus.SUBMITTED,
    ).length;
    const submittedCount = evaluations.filter(
      (evaluation) =>
        evaluation.status === SubmissionEvaluationStatus.SUBMITTED,
    ).length;

    return {
      evaluations,
      teamNameById,
      pendingCount,
      submittedCount,
      recentNotifications: notifications,
      globalAnnouncements,
    };
  }

  async getEvaluations(evaluatorId: string) {
    const workspaceId = getWorkspaceIdFromContext();
    if (!workspaceId) {
      return { evaluations: [], teamNameById: {} };
    }

    const evaluations =
      await this.submissionEvaluationsService.getMyEvaluations(
        workspaceId,
        evaluatorId,
      );

    const teamIds = [
      ...new Set(evaluations.map((evaluation) => evaluation.teamId)),
    ];
    const teamNameById = await this.loadTeamNameMap(teamIds);

    return { evaluations, teamNameById };
  }

  getNotifications(
    evaluatorId: string,
    page = 1,
    limit = 20,
    isRead?: boolean,
  ) {
    return this.notificationsService.getMyNotifications(
      evaluatorId,
      page,
      limit,
      isRead,
    );
  }

  getProfile(evaluatorId: string) {
    return this.profilesService.getMyProfile(evaluatorId);
  }

  async getResults(evaluatorId: string) {
    const workspaceId = getWorkspaceIdFromContext();
    if (!workspaceId) {
      return { evaluations: [], teamNameById: {} };
    }

    const evaluations =
      await this.submissionEvaluationsService.getMyEvaluations(
        workspaceId,
        evaluatorId,
        SubmissionEvaluationStatus.SUBMITTED,
      );

    const teamIds = [
      ...new Set(evaluations.map((evaluation) => evaluation.teamId)),
    ];
    const teamNameById = await this.loadTeamNameMap(teamIds);

    return { evaluations, teamNameById };
  }

  private async loadTeamNameMap(teamIds: string[]) {
    if (!teamIds.length) {
      return {};
    }

    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true, projectTitle: true },
    });

    return Object.fromEntries(
      teams.map((team) => [
        team.id,
        team.name || team.projectTitle || 'Team',
      ]),
    );
  }
}
