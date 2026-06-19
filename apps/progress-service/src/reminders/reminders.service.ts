import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';
import { buildNotification } from '../common/notification-payload';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(
    RemindersService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  private internalHeaders() {
    return {
      'X-Internal-Api-Key':
        process.env.INTERNAL_API_KEY,
    };
  }

  private async sendNotification(
    payload: Omit<
      Parameters<typeof buildNotification>[0],
      'authUserId'
    > & { authUserId: string },
  ) {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
          buildNotification(payload),
          { headers: this.internalHeaders() },
        ),
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to notify ${payload.authUserId}: ${error.message}`,
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
        route: '/supervisor/submissions',
      });

      try {
        const proposals = await firstValueFrom(
          this.httpService.get(
            `${process.env.PROPOSAL_SERVICE_URL}/proposals/supervised/${deliverable.supervisorId}`,
            { headers: this.internalHeaders() },
          ),
        );

        for (const proposal of proposals.data) {
          const team = await firstValueFrom(
            this.httpService.get(
              `${process.env.TEAM_SERVICE_URL}/teams/${proposal.teamId}/members`,
              { headers: this.internalHeaders() },
            ),
          );

          for (const member of team.data) {
            await this.sendNotification({
              authUserId: member.authUserId,
              title: 'Submission Deadline Reminder',
              message: `${deliverable.title} is due within 24 hours.`,
              type: 'DEADLINE_REMINDER',
              entityType: 'DELIVERABLE',
              entityId: deliverable.id,
              route: '/student/submissions',
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
          const team = await firstValueFrom(
            this.httpService.get(
              `${process.env.TEAM_SERVICE_URL}/teams/${assignment.teamId}/members`,
              { headers: this.internalHeaders() },
            ),
          );

          for (const member of team.data) {
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
