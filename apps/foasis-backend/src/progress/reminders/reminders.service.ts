import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../../prisma/prisma.service';
import { ProposalsService } from '../../proposals/proposals.service';
import { TeamsService } from '../../teams/teams.service';
import { runWithWorkspaceContext } from '../../workspace/workspace-als';

import { ReminderTypes } from './reminder.types';
import { ScheduledReminderService } from './scheduled-reminder.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(
    RemindersService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduledReminderService: ScheduledReminderService,
    private readonly proposalsService: ProposalsService,
    private readonly teamsService: TeamsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runMinuteJobs() {
    try {
      const result =
        await this.proposalsService.expirePendingSupervisorRequests();

      if (result.expired > 0) {
        this.logger.log(
          `Expired ${result.expired} supervisor request(s)`,
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to expire supervisor requests: ${message}`,
      );
    }

    try {
      const processed =
        await this.scheduledReminderService.processDueReminders();
      if (processed > 0) {
        this.logger.log(`Processed ${processed} scheduled reminder(s)`);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process scheduled reminders: ${message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async enqueueDailyReminders() {
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
      await runWithWorkspaceContext(
        deliverable.workspaceId,
        async () => {
          const existing =
            await this.prisma.scheduledReminder.findFirst({
              where: {
                reminderType: ReminderTypes.DELIVERABLE_DEADLINE,
                entityType: 'DELIVERABLE',
                entityId: deliverable.id,
                status: { in: ['PENDING', 'SENT'] },
              },
            });

          if (existing) {
            return;
          }

          await this.scheduledReminderService.schedule({
            workspaceId: deliverable.workspaceId,
            reminderType: ReminderTypes.DELIVERABLE_DEADLINE,
            entityType: 'DELIVERABLE',
            entityId: deliverable.id,
            title: 'Deliverable Deadline Approaching',
            message: `${deliverable.title} is due within 24 hours.`,
            route: '/supervisor/work-stream',
            channels: ['notification'],
            scheduledFor: now,
            audienceSpec: { roles: ['SUPERVISOR'] },
            metadata: {
              type: 'DEADLINE_REMINDER',
              entityType: 'DELIVERABLE',
              entityId: deliverable.id,
            },
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
                await this.scheduledReminderService.schedule({
                  workspaceId: deliverable.workspaceId,
                  reminderType: ReminderTypes.DELIVERABLE_DEADLINE,
                  entityType: 'DELIVERABLE',
                  entityId: `${deliverable.id}:${member.authUserId}`,
                  title: 'Submission Deadline Reminder',
                  message: `${deliverable.title} is due within 24 hours.`,
                  route: '/student/work-stream',
                  channels: ['notification'],
                  scheduledFor: now,
                  audienceSpec: {
                    roles: ['STUDENT'],
                    userIds: [member.authUserId],
                  },
                  metadata: {
                    type: 'DEADLINE_REMINDER',
                    entityType: 'DELIVERABLE',
                    entityId: deliverable.id,
                  },
                });
              }
            }
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              `Failed student deliverable reminder enqueue: ${message}`,
            );
          }
        },
      );
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
      await runWithWorkspaceContext(
        evaluation.workspaceId,
        async () => {
          for (const assignment of evaluation.assignments) {
            const existing =
              await this.prisma.scheduledReminder.findFirst({
                where: {
                  reminderType: ReminderTypes.EVALUATION_UPCOMING,
                  entityType: 'EVALUATION',
                  entityId: `${evaluation.id}:${assignment.teamId}`,
                  status: { in: ['PENDING', 'SENT'] },
                },
              });

            if (existing) {
              continue;
            }

            try {
              const members =
                await this.teamsService.getTeamMembers(
                  assignment.teamId,
                );

              await this.scheduledReminderService.schedule({
                workspaceId: evaluation.workspaceId,
                reminderType: ReminderTypes.EVALUATION_UPCOMING,
                entityType: 'EVALUATION',
                entityId: `${evaluation.id}:${assignment.teamId}`,
                title: 'Evaluation Reminder',
                message: `${evaluation.title} is scheduled within 24 hours at ${evaluation.venue}.`,
                route: '/student/evaluations',
                channels: ['notification'],
                scheduledFor: now,
                audienceSpec: {
                  roles: ['STUDENT'],
                  userIds: members.map(
                    (member) => member.authUserId,
                  ),
                },
                metadata: {
                  type: 'EVALUATION_ASSIGNED',
                  entityType: 'EVALUATION',
                  entityId: evaluation.id,
                },
              });
            } catch (error: unknown) {
              const message =
                error instanceof Error
                  ? error.message
                  : String(error);
              this.logger.error(
                `Failed evaluation reminder enqueue: ${message}`,
              );
            }
          }
        },
      );
    }

    this.logger.log(
      `Enqueued reminders for ${dueDeliverables.length} deliverables and ${upcomingEvaluations.length} evaluations`,
    );
  }
}
