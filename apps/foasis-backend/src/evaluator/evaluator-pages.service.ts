import { Injectable } from '@nestjs/common';

import { NotificationsService } from '../notifications/notifications.service';
import { EvaluationPanelsService } from '../progress/evaluation-panels/evaluation-panels.service';
import { EvaluationResultsService } from '../progress/evaluation-results/evaluation-results.service';
import { ProfilesService } from '../users/profiles.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EvaluatorPagesService {
  constructor(
    private readonly evaluationPanelsService: EvaluationPanelsService,
    private readonly evaluationResultsService: EvaluationResultsService,
    private readonly notificationsService: NotificationsService,
    private readonly profilesService: ProfilesService,
    private readonly prisma: PrismaService,
  ) {}

  async getDashboard(evaluatorId: string) {
    const [panels, notifications] = await Promise.all([
      this.evaluationPanelsService.getMyPanels(evaluatorId),
      this.notificationsService
        .getMyNotifications(evaluatorId, 1, 5)
        .catch(() => ({
          data: [],
          total: 0,
          page: 1,
          limit: 5,
        })),
    ]);

    const teamIds = [
      ...new Set(
        panels.flatMap(
          (panel) =>
            panel.assignments?.map((a) => a.teamId) ?? [],
        ),
      ),
    ];

    const teamNameById = await this.loadTeamNameMap(teamIds);

    return {
      panels,
      teamNameById,
      recentNotifications: notifications,
    };
  }

  async getEvaluations(evaluatorId: string) {
    const panels =
      await this.evaluationPanelsService.getMyPanels(
        evaluatorId,
      );

    const teamIds = [
      ...new Set(
        panels.flatMap(
          (panel) =>
            panel.assignments?.map((a) => a.teamId) ?? [],
        ),
      ),
    ];

    const [teamNameById, results] = await Promise.all([
      this.loadTeamNameMap(teamIds),
      this.evaluationResultsService.getResultsByTeamIds(
        teamIds,
      ),
    ]);

    return { panels, teamNameById, results };
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
    const panels =
      await this.evaluationPanelsService.getMyPanels(
        evaluatorId,
      );

    const teamIds = [
      ...new Set(
        panels.flatMap(
          (panel) =>
            panel.assignments?.map((a) => a.teamId) ?? [],
        ),
      ),
    ];

    const [teamNameById, results] = await Promise.all([
      this.loadTeamNameMap(teamIds),
      this.evaluationResultsService.getResultsByTeamIds(
        teamIds,
      ),
    ]);

    return { panels, teamNameById, results };
  }

  private async loadTeamNameMap(teamIds: string[]) {
    if (!teamIds.length) {
      return {};
    }

    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });

    return Object.fromEntries(
      teams.map((team) => [team.id, team.name]),
    );
  }
}
