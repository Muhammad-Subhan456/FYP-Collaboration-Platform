import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';

import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { TeamAccessService } from '../common/team-access.service';

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly teamAccessService: TeamAccessService,
    private readonly httpService: HttpService,
  ) {}

  private internalHeaders() {
    return {
      'X-Internal-Api-Key':
        process.env.INTERNAL_API_KEY,
    };
  }

  private async notifyTeamMembers(
    teamId: string,
    title: string,
    message: string,
  ) {
    try {
      const members =
        await this.teamAccessService.getTeamMembers(
          teamId,
        );

      for (const member of members) {
        await firstValueFrom(
          this.httpService.post(
            `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
            {
              authUserId: member.authUserId,
              title,
              message,
            },
            { headers: this.internalHeaders() },
          ),
        );
      }
    } catch {
      // Non-blocking
    }
  }

  private async notifySupervisedTeams(
    supervisorId: string,
    title: string,
    message: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.PROPOSAL_SERVICE_URL}/proposals/supervised/${supervisorId}`,
          { headers: this.internalHeaders() },
        ),
      );

      for (const proposal of response.data) {
        await this.notifyTeamMembers(
          proposal.teamId,
          title,
          message,
        );
      }
    } catch {
      // Non-blocking
    }
  }

  async createDeliverable(
    supervisorId: string,
    dto: CreateDeliverableDto,
  ) {
    const deliverable =
      await this.prisma.deliverable.create({
        data: {
          supervisorId,
          title: dto.title,
          description: dto.description,
          type: dto.type,
          dueDate: new Date(dto.dueDate),
          attachmentUrl: dto.attachmentUrl,
        },
      });

    await this.activityLogsService.logActivity(
      supervisorId,
      'Deliverable Created',
      deliverable.title,
    );

    await this.notifySupervisedTeams(
      supervisorId,
      'New Deliverable Assigned',
      `${deliverable.title} is due on ${deliverable.dueDate.toDateString()}.`,
    );

    return deliverable;
  }

  async getMyDeliverables(supervisorId: string) {
    return this.prisma.deliverable.findMany({
      where: { supervisorId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getForMyTeam(authorization: string) {
    const supervisorId =
      await this.teamAccessService.getAssignedSupervisorId(
        authorization,
      );

    if (!supervisorId) {
      throw new BadRequestException(
        'No supervisor assigned to your team yet',
      );
    }

    return this.prisma.deliverable.findMany({
      where: {
        supervisorId,
        isActive: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateDeliverable(
    deliverableId: string,
    supervisorId: string,
    dto: UpdateDeliverableDto,
  ) {
    const deliverable =
      await this.prisma.deliverable.findUnique({
        where: { id: deliverableId },
      });

    if (!deliverable) {
      throw new BadRequestException(
        'Deliverable not found',
      );
    }

    if (deliverable.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only update your own deliverables',
      );
    }

    return this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
      },
    });
  }
}
