import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';

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
    authUserId: string,
    title: string,
    message: string,
  ) {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
          { authUserId, title, message },
          { headers: this.internalHeaders() },
        ),
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to notify ${authUserId}: ${error.message}`,
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
      await this.sendNotification(
        deliverable.supervisorId,
        'Deliverable Deadline Approaching',
        `${deliverable.title} is due within 24 hours.`,
      );

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
            await this.sendNotification(
              member.authUserId,
              'Submission Deadline Reminder',
              `${deliverable.title} is due within 24 hours.`,
            );
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
            await this.sendNotification(
              member.authUserId,
              'Evaluation Reminder',
              `${evaluation.title} is scheduled within 24 hours at ${evaluation.venue}.`,
            );
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
