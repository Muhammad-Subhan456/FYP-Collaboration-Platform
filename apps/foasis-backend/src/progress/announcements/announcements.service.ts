import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkStreamEntityType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type {
  AnnouncementDeletedPayload,
  AnnouncementSnapshotPayload,
} from '../../domain-events/domain-event.types';
import { TeamAccessService } from '../common/team-access.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { WorkStreamService } from '../work-stream/work-stream.service';
import { serializeAnnouncement } from '../work-stream/work-stream-realtime';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamAccessService: TeamAccessService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly workStreamService: WorkStreamService,
    private readonly domainEventService: DomainEventService,
  ) {}

  private parseOptionalDate(
    value?: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(
      value.includes('T')
        ? value
        : `${value}T00:00:00.000Z`,
    );

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        'Invalid due date format',
      );
    }

    return parsed;
  }

  private teamVisibilityWhere(teamId: string) {
    return {
      OR: [{ teamId }, { teamId: null }],
    };
  }

  async createAnnouncement(
    supervisorId: string,
    dto: CreateAnnouncementDto,
  ) {
    const dueDate = this.parseOptionalDate(
      dto.dueDate,
    );

    const teamIds =
      await this.workStreamService.resolveTeamIdsForSupervisor(
        supervisorId,
        dto.teamIds,
      );

    if (teamIds.length === 0) {
      throw new BadRequestException(
        'At least one team must be selected',
      );
    }

    const created: Awaited<
      ReturnType<typeof this.prisma.announcement.create>
    >[] = [];

    for (const teamId of teamIds) {
      const announcement =
        await this.prisma.announcement.create({
          data: {
            supervisorId,
            teamId,
            title: dto.title,
            message: dto.message,
            type: dto.type ?? 'GENERAL',
            ...(dueDate && { dueDate }),
          },
        });

      await this.workStreamService.saveAttachments(
        WorkStreamEntityType.ANNOUNCEMENT,
        announcement.id,
        teamId,
        dto.attachments,
      );

      void this.teamAccessService
        .notifyTeamMembers(
          teamId,
          {
            title: 'FOASIS Team Announcement',
            message: `${announcement.title}: ${announcement.message}`,
            type: 'ANNOUNCEMENT_PUBLISHED',
            entityType: 'ANNOUNCEMENT',
            entityId: announcement.id,
            route: '/student/work-stream',
          },
          { excludeAuthUserId: supervisorId },
        )
        .catch(() => undefined);

      this.domainEventService.emitSafe<AnnouncementSnapshotPayload>({
        name: DomainEvents.ANNOUNCEMENT_CREATED,
        timestamp: announcement.createdAt.toISOString(),
        actorId: supervisorId,
        scope: { type: 'team', id: teamId },
        entity: { type: 'ANNOUNCEMENT', id: announcement.id },
        payload: {
          teamId,
          announcement: serializeAnnouncement(announcement, {
            attachmentCount: dto.attachments?.length ?? 0,
          }),
        },
      });

      created.push(announcement);
    }

    await this.activityLogsService.logActivity(
      supervisorId,
      'Announcement Published',
      dto.title,
    );

    return created.length === 1 ? created[0] : created;
  }

  async updateAnnouncement(
    announcementId: string,
    supervisorId: string,
    dto: UpdateAnnouncementDto,
  ) {
    const announcement =
      await this.prisma.announcement.findUnique({
        where: { id: announcementId },
      });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only update your own announcements',
      );
    }

    const dueDate =
      dto.dueDate !== undefined
        ? this.parseOptionalDate(dto.dueDate)
        : undefined;

    const updated = await this.prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.message !== undefined && {
          message: dto.message,
        }),
        ...(dto.type !== undefined && {
          type: dto.type,
        }),
        ...(dto.dueDate !== undefined && {
          dueDate: dueDate ?? null,
        }),
      },
    });

    if (dto.attachments !== undefined) {
      await this.workStreamService.replaceAttachments(
        WorkStreamEntityType.ANNOUNCEMENT,
        announcementId,
        announcement.teamId ?? supervisorId,
        dto.attachments,
      );
    }

    const teamId = updated.teamId ?? supervisorId;
    this.domainEventService.emitSafe<AnnouncementSnapshotPayload>({
      name: DomainEvents.ANNOUNCEMENT_UPDATED,
      timestamp: new Date().toISOString(),
      actorId: supervisorId,
      scope: { type: 'team', id: teamId },
      entity: { type: 'ANNOUNCEMENT', id: updated.id },
      payload: {
        teamId,
        announcement: serializeAnnouncement(updated, {
          attachmentCount: dto.attachments?.length,
        }),
      },
    });

    return updated;
  }

  async deleteAnnouncement(
    announcementId: string,
    supervisorId: string,
  ) {
    const announcement =
      await this.prisma.announcement.findUnique({
        where: { id: announcementId },
      });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.supervisorId !== supervisorId) {
      throw new ForbiddenException(
        'You can only delete your own announcements',
      );
    }

    await this.prisma.$transaction([
      this.prisma.workStreamComment.deleteMany({
        where: {
          entityType: WorkStreamEntityType.ANNOUNCEMENT,
          entityId: announcementId,
        },
      }),
      this.prisma.workStreamAttachment.deleteMany({
        where: {
          entityType: WorkStreamEntityType.ANNOUNCEMENT,
          entityId: announcementId,
        },
      }),
      this.prisma.announcement.delete({
        where: { id: announcementId },
      }),
    ]);

    const teamId = announcement.teamId ?? supervisorId;
    this.domainEventService.emitSafe<AnnouncementDeletedPayload>({
      name: DomainEvents.ANNOUNCEMENT_DELETED,
      timestamp: new Date().toISOString(),
      actorId: supervisorId,
      scope: { type: 'team', id: teamId },
      entity: { type: 'ANNOUNCEMENT', id: announcementId },
      payload: {
        teamId,
        announcementId,
      },
    });

    return { success: true };
  }

  async getMyAnnouncements(supervisorId: string) {
    return this.prisma.announcement.findMany({
      where: { supervisorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForMyTeam(authorization: string) {
    const supervisorId =
      await this.teamAccessService.getAssignedSupervisorId(
        authorization,
      );

    const team =
      await this.teamAccessService.getMyTeam(authorization);

    return this.getForSupervisor(
      supervisorId,
      team?.id ?? null,
    );
  }

  async getForMyTeamByUserId(
    authUserId: string,
    supervisorId?: string | null,
    teamId?: string | null,
  ) {
    const resolvedSupervisorId =
      supervisorId !== undefined
        ? supervisorId
        : await this.teamAccessService.getAssignedSupervisorIdByUserId(
            authUserId,
          );

    const resolvedTeamId =
      teamId !== undefined
        ? teamId
        : (
            await this.teamAccessService.getMyTeamByUserId(
              authUserId,
            )
          )?.id ?? null;

    return this.getForSupervisor(
      resolvedSupervisorId,
      resolvedTeamId,
    );
  }

  getForSupervisor(
    supervisorId: string | null,
    teamId: string | null = null,
  ) {
    if (!supervisorId) {
      return [];
    }

    return this.prisma.announcement.findMany({
      where: {
        supervisorId,
        ...(teamId
          ? this.teamVisibilityWhere(teamId)
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
