import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { ProposalsService } from '../../proposals/proposals.service';
import { TeamsService } from '../../teams/teams.service';
import { NotificationPayload } from '../../common/helpers/notification-payload';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(
    RemindersService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly proposalsService: ProposalsService,
    private readonly teamsService: TeamsService,
  ) {}

  private async sendNotification(
    payload: NotificationPayload,
  ) {
    try {
      await this.notificationDispatch.send(payload);
    } catch (error: any) {
      this.logger.error(
        `Failed to notify ${payload.authUserId}: ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expireSupervisorRequests() {
    try {
      const result =
        await this.proposalsService.expirePendingSupervisorRequests();

      if (result.expired > 0) {
        this.logger.log(
          `Expired ${result.expired} supervisor request(s)`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to expire supervisor requests: ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDeadlineReminders() {
    const now = new Date();
    const in24Hours = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    );

    const dueDeliverables =
      await this.prisma.deliverable.findMany({
        where: {
          isActive: true,
          dueDate: {
            gte: now,
            lte: in24Hours,
          },
        },
      });

    for (const deliverable of dueDeliverables) {
      await this.sendNotification({
        authUserId: deliverable.supervisorId,
        title: 'Deliverable Deadline Approaching',
        message: `${deliverable.title} is due within 24 hours.`,
        type: 'DEADLINE_REMINDER',
        entityType: 'DELIVERABLE',
        entityId: deliverable.id,
        route: '/supervisor/work-stream',
      });

      try {
        const proposals =
          await this.proposalsService.getSupervisedProposals(
            deliverable.supervisorId,
          );

        for (const proposal of proposals) {
          const members =
            await this.teamsService.getTeamMembers(
              proposal.teamId,
            );

          for (const member of members) {
            await this.sendNotification({
              authUserId: member.authUserId,
              title: 'Submission Deadline Reminder',
              message: `${deliverable.title} is due within 24 hours.`,
              type: 'DEADLINE_REMINDER',
              entityType: 'DELIVERABLE',
              entityId: deliverable.id,
              route: '/student/work-stream',
            });
          }
        }
      } catch (error: any) {
        this.logger.error(
          `Failed student deliverable reminder: ${error.message}`,
        );
      }
    }

    const upcomingEvaluations =
      await this.prisma.evaluation.findMany({
        where: {
          date: {
            gte: now,
            lte: in24Hours,
          },
        },
        include: {
          assignments: true,
        },
      });

    for (const evaluation of upcomingEvaluations) {
      for (const assignment of evaluation.assignments) {
        try {
          const members =
            await this.teamsService.getTeamMembers(
              assignment.teamId,
            );

          for (const member of members) {
            await this.sendNotification({
              authUserId: member.authUserId,
              title: 'Evaluation Reminder',
              message: `${evaluation.title} is scheduled within 24 hours at ${evaluation.venue}.`,
              type: 'EVALUATION_ASSIGNED',
              entityType: 'EVALUATION',
              entityId: evaluation.id,
              route: '/student/evaluations',
            });
          }
        } catch (error: any) {
          this.logger.error(
            `Failed evaluation reminder for team ${assignment.teamId}: ${error.message}`,
          );
        }
      }
    }

    this.logger.log(
      `Reminders sent: ${dueDeliverables.length} deliverables, ${upcomingEvaluations.length} evaluations`,
    );
  }
}
