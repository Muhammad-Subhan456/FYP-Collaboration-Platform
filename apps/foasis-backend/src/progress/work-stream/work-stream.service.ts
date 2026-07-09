import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  WorkStreamEntityType,
  type Announcement,
  type Deliverable,
  type Submission,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { ProposalsService } from '../../proposals/proposals.service';
import { ProfilesService } from '../../users/profiles.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import type { WorkstreamCommentCreatedPayload } from '../../domain-events/domain-event.types';
import { TeamAccessService } from '../common/team-access.service';

import { CreateWorkStreamCommentDto } from './dto/create-comment.dto';
import type { WorkStreamAttachmentDto } from './dto/work-stream-attachment.dto';
import { serializeWorkstreamComment } from './work-stream-realtime';

type EntityRef = {
  entityType: WorkStreamEntityType;
  entityId: string;
};

@Injectable()
export class WorkStreamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamAccessService: TeamAccessService,
    private readonly proposalsService: ProposalsService,
    private readonly profilesService: ProfilesService,
    private readonly domainEventService: DomainEventService,
  ) {}

  entityKey(entityType: WorkStreamEntityType, entityId: string) {
    return `${entityType}:${entityId}`;
  }

  private teamVisibilityWhere(teamId: string) {
    return {
      OR: [{ teamId }, { teamId: null }],
    };
  }

  async getSupervisedTeamIds(supervisorId: string) {
    const proposals =
      await this.proposalsService.getSupervisedProposals(
        supervisorId,
      );

    return [
      ...new Set(proposals.map((proposal) => proposal.teamId)),
    ];
  }

  async resolveTeamIdsForSupervisor(
    supervisorId: string,
    teamIds?: string[],
  ) {
    const supervisedTeamIds =
      await this.getSupervisedTeamIds(supervisorId);

    if (!teamIds?.length) {
      return supervisedTeamIds;
    }

    const invalid = teamIds.filter(
      (id) => !supervisedTeamIds.includes(id),
    );

    if (invalid.length > 0) {
      throw new ForbiddenException(
        'One or more selected teams are not supervised by you',
      );
    }

    return teamIds;
  }

  async saveAttachments(
    entityType: WorkStreamEntityType,
    entityId: string,
    teamId: string,
    attachments?: WorkStreamAttachmentDto[],
  ) {
    if (!attachments?.length) {
      return;
    }

    const team = await this.prisma.team.findFirst({
      where: { id: teamId },
      select: { workspaceId: true },
    });
    if (!team) {
      throw new BadRequestException('Team not found');
    }

    await this.prisma.workStreamAttachment.createMany({
      data: attachments.map((attachment) => ({
        id: randomUUID(),
        workspaceId: team.workspaceId,
        entityType,
        entityId,
        teamId,
        fileUrl: attachment.fileUrl,
        fileName: attachment.fileName,
      })),
    });
  }

  async replaceAttachments(
    entityType: WorkStreamEntityType,
    entityId: string,
    teamId: string,
    attachments?: WorkStreamAttachmentDto[],
  ) {
    await this.prisma.workStreamAttachment.deleteMany({
      where: { entityType, entityId },
    });

    await this.saveAttachments(
      entityType,
      entityId,
      teamId,
      attachments,
    );
  }

  private async loadCommentCounts(refs: EntityRef[]) {
    if (refs.length === 0) {
      return new Map<string, number>();
    }

    const grouped =
      await this.prisma.workStreamComment.groupBy({
        by: ['entityType', 'entityId'],
        where: {
          OR: refs.map((ref) => ({
            entityType: ref.entityType,
            entityId: ref.entityId,
          })),
        },
        _count: { _all: true },
      });

    const map = new Map<string, number>();

    for (const row of grouped) {
      map.set(
        this.entityKey(row.entityType, row.entityId),
        row._count._all,
      );
    }

    return map;
  }

  private async loadAttachmentsByEntity(refs: EntityRef[]) {
    if (refs.length === 0) {
      return new Map<
        string,
        {
          id: string;
          fileUrl: string;
          fileName: string;
          createdAt: Date;
        }[]
      >();
    }

    const attachments =
      await this.prisma.workStreamAttachment.findMany({
        where: {
          OR: refs.map((ref) => ({
            entityType: ref.entityType,
            entityId: ref.entityId,
          })),
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          fileUrl: true,
          fileName: true,
          createdAt: true,
        },
      });

    const map = new Map<
      string,
      {
        id: string;
        fileUrl: string;
        fileName: string;
        createdAt: Date;
      }[]
    >();

    for (const attachment of attachments) {
      const key = this.entityKey(
        attachment.entityType,
        attachment.entityId,
      );
      const list = map.get(key) ?? [];
      list.push({
        id: attachment.id,
        fileUrl: attachment.fileUrl,
        fileName: attachment.fileName,
        createdAt: attachment.createdAt,
      });
      map.set(key, list);
    }

    return map;
  }

  private async loadCommentsByEntity(refs: EntityRef[]) {
    if (refs.length === 0) {
      return new Map<
        string,
        {
          id: string;
          authUserId: string;
          body: string;
          createdAt: Date;
        }[]
      >();
    }

    const comments =
      await this.prisma.workStreamComment.findMany({
        where: {
          OR: refs.map((ref) => ({
            entityType: ref.entityType,
            entityId: ref.entityId,
          })),
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          authUserId: true,
          body: true,
          createdAt: true,
        },
      });

    const map = new Map<
      string,
      {
        id: string;
        authUserId: string;
        body: string;
        createdAt: Date;
      }[]
    >();

    for (const comment of comments) {
      const key = this.entityKey(
        comment.entityType,
        comment.entityId,
      );
      const list = map.get(key) ?? [];
      list.push({
        id: comment.id,
        authUserId: comment.authUserId,
        body: comment.body,
        createdAt: comment.createdAt,
      });
      map.set(key, list);
    }

    return map;
  }

  private mapAttachments(
    entityType: WorkStreamEntityType,
    entityId: string,
    legacyUrl: string | null | undefined,
    attachmentMap: Map<
      string,
      {
        id: string;
        fileUrl: string;
        fileName: string;
        createdAt: Date;
      }[]
    >,
  ) {
    const key = this.entityKey(entityType, entityId);
    const stored = attachmentMap.get(key) ?? [];

    if (!legacyUrl) {
      return stored;
    }

    if (stored.some((item) => item.fileUrl === legacyUrl)) {
      return stored;
    }

    return [
      {
        id: `legacy-${entityId}`,
        fileUrl: legacyUrl,
        fileName: legacyUrl.split('/').pop() ?? 'attachment',
        createdAt: new Date(0),
      },
      ...stored,
    ];
  }

  private previewText(text: string, max = 160) {
    const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length <= max) {
      return plain;
    }

    return `${plain.slice(0, max).trim()}…`;
  }

  private async assertStudentEntityAccess(
    authUserId: string,
    entityType: WorkStreamEntityType,
    entityId: string,
  ) {
    const team =
      await this.teamAccessService.getMyTeamByUserId(
        authUserId,
      );

    if (!team?.id) {
      throw new ForbiddenException(
        'You are not a member of any team',
      );
    }

    const supervisorId =
      await this.teamAccessService.getAssignedSupervisorIdByUserId(
        authUserId,
      );

    if (!supervisorId) {
      throw new ForbiddenException(
        'No supervisor assigned to your team',
      );
    }

    if (entityType === 'ANNOUNCEMENT') {
      const announcement =
        await this.prisma.announcement.findUnique({
          where: { id: entityId },
        });

      if (
        !announcement ||
        announcement.supervisorId !== supervisorId ||
        (announcement.teamId &&
          announcement.teamId !== team.id)
      ) {
        throw new ForbiddenException(
          'Announcement not found for your team',
        );
      }

      return { teamId: team.id, supervisorId };
    }

    const deliverable =
      await this.prisma.deliverable.findUnique({
        where: { id: entityId },
      });

    if (
      !deliverable ||
      deliverable.supervisorId !== supervisorId ||
      (deliverable.teamId && deliverable.teamId !== team.id)
    ) {
      throw new ForbiddenException(
        'Deliverable not found for your team',
      );
    }

    return { teamId: team.id, supervisorId };
  }

  private async assertSupervisorEntityAccess(
    supervisorId: string,
    entityType: WorkStreamEntityType,
    entityId: string,
  ) {
    if (entityType === 'ANNOUNCEMENT') {
      const announcement =
        await this.prisma.announcement.findUnique({
          where: { id: entityId },
        });

      if (
        !announcement ||
        announcement.supervisorId !== supervisorId
      ) {
        throw new ForbiddenException(
          'Announcement not found',
        );
      }

      if (announcement.teamId) {
        await this.resolveTeamIdsForSupervisor(
          supervisorId,
          [announcement.teamId],
        );
      }

      return announcement;
    }

    const deliverable =
      await this.prisma.deliverable.findUnique({
        where: { id: entityId },
      });

    if (
      !deliverable ||
      deliverable.supervisorId !== supervisorId
    ) {
      throw new ForbiddenException('Deliverable not found');
    }

    if (deliverable.teamId) {
      await this.resolveTeamIdsForSupervisor(supervisorId, [
        deliverable.teamId,
      ]);
    }

    return deliverable;
  }

  async createComment(
    authUserId: string,
    role: string,
    dto: CreateWorkStreamCommentDto,
  ) {
    if (!dto.body?.trim()) {
      throw new BadRequestException('Comment cannot be empty');
    }

    let teamId: string;

    if (role === 'STUDENT') {
      const access = await this.assertStudentEntityAccess(
        authUserId,
        dto.entityType,
        dto.entityId,
      );
      teamId = access.teamId;
    } else if (role === 'SUPERVISOR') {
      const entity = await this.assertSupervisorEntityAccess(
        authUserId,
        dto.entityType,
        dto.entityId,
      );
      teamId =
        'teamId' in entity && entity.teamId
          ? entity.teamId
          : (
              await this.getSupervisedTeamIds(authUserId)
            )[0] ?? authUserId;
    } else {
      throw new ForbiddenException('Invalid role');
    }

    const team = await this.prisma.team.findFirst({
      where: { id: teamId },
      select: { workspaceId: true },
    });
    if (!team) {
      throw new BadRequestException('Team not found');
    }

    const comment = await this.prisma.workStreamComment.create({
      data: {
        workspaceId: team.workspaceId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        teamId,
        authUserId,
        body: dto.body.trim(),
      },
    });

    this.domainEventService.emitSafe<WorkstreamCommentCreatedPayload>({
      name: DomainEvents.WORKSTREAM_COMMENT_CREATED,
      timestamp: comment.createdAt.toISOString(),
      actorId: authUserId,
      scope: { type: 'team', id: teamId },
      entity: {
        type: dto.entityType,
        id: dto.entityId,
      },
      payload: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        teamId,
        comment: serializeWorkstreamComment(comment),
      },
    });

    const [actorDisplayName, entityTitle] = await Promise.all([
      this.actorName(authUserId),
      this.getEntityTitle(dto.entityType, dto.entityId),
    ]);

    this.scheduleWorkStreamCommentNotifications(
      teamId,
      authUserId,
      dto.entityType,
      dto.entityId,
      actorDisplayName,
      entityTitle,
      role,
    );

    return comment;
  }

  private async actorName(actorId: string) {
    const profile = await this.profilesService
      .findOne(actorId)
      .catch(() => null);

    return profile?.fullName ?? 'A user';
  }

  private async getEntityTitle(
    entityType: WorkStreamEntityType,
    entityId: string,
  ) {
    if (entityType === 'ANNOUNCEMENT') {
      const announcement =
        await this.prisma.announcement.findUnique({
          where: { id: entityId },
          select: { title: true },
        });

      return announcement?.title ?? 'announcement';
    }

    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id: entityId },
      select: { title: true },
    });

    return deliverable?.title ?? 'deliverable';
  }

  private studentRouteForEntity(
    entityType: WorkStreamEntityType,
    entityId: string,
  ) {
    if (entityType === 'ANNOUNCEMENT') {
      return `/student/work-stream?announcementId=${entityId}`;
    }

    return `/student/work-stream?deliverableId=${entityId}&tab=deliverables`;
  }

  private supervisorRouteForEntity(
    entityType: WorkStreamEntityType,
  ) {
    return entityType === 'ANNOUNCEMENT'
      ? '/supervisor/work-stream?tab=announcements'
      : '/supervisor/work-stream?tab=deliverables';
  }

  private scheduleWorkStreamCommentNotifications(
    teamId: string,
    actorId: string,
    entityType: WorkStreamEntityType,
    entityId: string,
    actorDisplayName: string,
    entityTitle: string,
    role: string,
  ) {
    void (async () => {
      try {
        const context = {
          title: 'New comment',
          message: `${actorDisplayName} commented on "${entityTitle}".`,
          type: 'WORKSTREAM_COMMENTED',
          entityType,
          entityId,
          route: this.studentRouteForEntity(entityType, entityId),
        };

        await this.teamAccessService.notifyTeamMembers(
          teamId,
          context,
          { excludeAuthUserId: actorId },
        );

        if (role === 'STUDENT') {
          await this.teamAccessService.notifyAssignedSupervisor(
            teamId,
            {
              ...context,
              route: this.supervisorRouteForEntity(entityType),
            },
          );
        }
      } catch {
        // Non-blocking background delivery
      }
    })();
  }

  async getStudentWorkStream(
    authUserId: string,
    team: { id: string; name: string } | null,
    supervisorId: string | null,
    phaseId?: string,
  ) {
    if (!team?.id || !supervisorId) {
      return {
        team,
        supervisorProfile: null,
        announcements: [],
        deliverables: [],
        submissionHistories: {},
        profiles: {},
        commentsByEntity: {},
      };
    }

    const [announcements, deliverables, submissionHistories, supervisorProfile] =
      await Promise.all([
        this.prisma.announcement.findMany({
          where: {
            supervisorId,
            ...this.teamVisibilityWhere(team.id),
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.deliverable.findMany({
          where: {
            supervisorId,
            isActive: true,
            ...(phaseId ? { phaseId } : {}),
            ...this.teamVisibilityWhere(team.id),
          },
          include: { phase: true, template: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.submission.findMany({
          where: { teamId: team.id },
          orderBy: [
            { deliverableId: 'asc' },
            { version: 'desc' },
          ],
        }),
        this.profilesService
          .findManyByAuthUserIds([supervisorId])
          .then((profiles) => profiles[supervisorId] ?? null)
          .catch(() => null),
      ]);

    const histories = submissionHistories.reduce(
      (acc, submission) => {
        if (!acc[submission.deliverableId]) {
          acc[submission.deliverableId] = [];
        }
        acc[submission.deliverableId].push(submission);
        return acc;
      },
      {} as Record<string, Submission[]>,
    );

    const refs: EntityRef[] = [
      ...announcements.map((item) => ({
        entityType: 'ANNOUNCEMENT' as const,
        entityId: item.id,
      })),
      ...deliverables.map((item) => ({
        entityType: 'DELIVERABLE' as const,
        entityId: item.id,
      })),
    ];

    const [commentCounts, attachmentMap, commentsMap] =
      await Promise.all([
        this.loadCommentCounts(refs),
        this.loadAttachmentsByEntity(refs),
        this.loadCommentsByEntity(refs),
      ]);

    const commentAuthorIds = new Set<string>();
    for (const comments of commentsMap.values()) {
      for (const comment of comments) {
        commentAuthorIds.add(comment.authUserId);
      }
    }
    commentAuthorIds.add(supervisorId);

    const profiles =
      commentAuthorIds.size > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...commentAuthorIds])
            .catch(() => ({}))
        : {};

    return {
      team,
      supervisorProfile,
      announcements: announcements.map((item) =>
        this.mapAnnouncementSummary(
          item,
          commentCounts,
          attachmentMap,
          supervisorProfile?.fullName ?? 'Supervisor',
        ),
      ),
      deliverables: deliverables.map((item) =>
        this.mapDeliverableSummary(
          item,
          commentCounts,
          attachmentMap,
          histories[item.id]?.[0] ?? null,
          undefined,
          histories[item.id]?.length ?? 0,
        ),
      ),
      submissionHistories: histories,
      profiles,
      commentsByEntity: Object.fromEntries(
        [...commentsMap.entries()].map(([key, comments]) => [
          key,
          comments,
        ]),
      ),
    };
  }

  async getSupervisorWorkStream(
    supervisorId: string,
    filterTeamId?: string,
    phaseId?: string,
  ) {
    const allTeamIds =
      await this.getSupervisedTeamIds(supervisorId);

    if (filterTeamId && !allTeamIds.includes(filterTeamId)) {
      throw new ForbiddenException(
        'Selected team is not supervised by you',
      );
    }

    const contentTeamIds = filterTeamId
      ? [filterTeamId]
      : allTeamIds;

    const teamRecords = await this.prisma.team.findMany({
      where: { id: { in: allTeamIds } },
      select: { id: true, name: true, projectTitle: true },
    });

    const teamInfoById = Object.fromEntries(
      teamRecords.map((team) => [team.id, team]),
    );

    const teams = allTeamIds.map((teamId) => {
      const team = teamInfoById[teamId];
      return {
        id: teamId,
        name: team?.name ?? team?.projectTitle ?? 'Team',
        projectTitle: team?.projectTitle ?? null,
      };
    });

    const uniqueTeams = [
      ...new Map(teams.map((team) => [team.id, team])).values(),
    ];

    const teamFilter =
      contentTeamIds.length > 0
        ? {
            OR: [
              { teamId: { in: contentTeamIds } },
              { teamId: null },
            ],
          }
        : { teamId: { in: [] as string[] } };

    const [announcements, deliverables] = await Promise.all([
      this.prisma.announcement.findMany({
        where: { supervisorId, ...teamFilter },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deliverable.findMany({
        where: {
          supervisorId,
          ...(phaseId ? { phaseId } : {}),
          ...teamFilter,
        },
        include: { phase: true, template: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const deliverableIds = deliverables.map((item) => item.id);

    const submissions =
      deliverableIds.length > 0
        ? await this.prisma.submission.findMany({
            where: {
              deliverableId: { in: deliverableIds },
              ...(contentTeamIds.length > 0
                ? { teamId: { in: contentTeamIds } }
                : {}),
            },
            orderBy: [
              { deliverableId: 'asc' },
              { version: 'desc' },
            ],
          })
        : [];

    const submissionsByDeliverable = submissions.reduce(
      (acc, submission) => {
        if (!acc[submission.deliverableId]) {
          acc[submission.deliverableId] = [];
        }
        acc[submission.deliverableId].push(submission);
        return acc;
      },
      {} as Record<string, Submission[]>,
    );

    const refs: EntityRef[] = [
      ...announcements.map((item) => ({
        entityType: 'ANNOUNCEMENT' as const,
        entityId: item.id,
      })),
      ...deliverables.map((item) => ({
        entityType: 'DELIVERABLE' as const,
        entityId: item.id,
      })),
    ];

    const [commentCounts, attachmentMap, commentsMap] =
      await Promise.all([
        this.loadCommentCounts(refs),
        this.loadAttachmentsByEntity(refs),
        this.loadCommentsByEntity(refs),
      ]);

    const commentAuthorIds = new Set<string>([supervisorId]);
    for (const comments of commentsMap.values()) {
      for (const comment of comments) {
        commentAuthorIds.add(comment.authUserId);
      }
    }

    const profiles =
      commentAuthorIds.size > 0
        ? await this.profilesService
            .findManyByAuthUserIds([...commentAuthorIds])
            .catch(() => ({}))
        : {};

    const teamNameById = Object.fromEntries(
      uniqueTeams.map((team) => [team.id, team.name]),
    );

    return {
      teams: uniqueTeams,
      teamNameById,
      announcements: announcements.map((item) =>
        this.mapAnnouncementSummary(
          item,
          commentCounts,
          attachmentMap,
          profiles[supervisorId]?.fullName ?? 'You',
          teamNameById[item.teamId ?? ''] ?? null,
        ),
      ),
      deliverables: deliverables.map((item) =>
        this.mapDeliverableSummary(
          item,
          commentCounts,
          attachmentMap,
          submissionsByDeliverable[item.id]?.[0] ?? null,
          teamNameById[item.teamId ?? ''] ?? null,
          submissionsByDeliverable[item.id]?.length ?? 0,
        ),
      ),
      submissionsByDeliverable,
      profiles,
      commentsByEntity: Object.fromEntries(
        [...commentsMap.entries()].map(([key, comments]) => [
          key,
          comments,
        ]),
      ),
    };
  }

  private mapAnnouncementSummary(
    item: Announcement,
    commentCounts: Map<string, number>,
    attachmentMap: Map<
      string,
      {
        id: string;
        fileUrl: string;
        fileName: string;
        createdAt: Date;
      }[]
    >,
    createdByName: string,
    teamName?: string | null,
  ) {
    const attachments = this.mapAttachments(
      'ANNOUNCEMENT',
      item.id,
      null,
      attachmentMap,
    );

    return {
      ...item,
      preview: this.previewText(item.message),
      createdByName,
      teamName: teamName ?? null,
      attachmentCount: attachments.length,
      commentCount:
        commentCounts.get(
          this.entityKey('ANNOUNCEMENT', item.id),
        ) ?? 0,
      attachments,
    };
  }

  private mapDeliverableSummary(
    item: Deliverable,
    commentCounts: Map<string, number>,
    attachmentMap: Map<
      string,
      {
        id: string;
        fileUrl: string;
        fileName: string;
        createdAt: Date;
      }[]
    >,
    latestSubmission: Submission | null,
    teamName?: string | null,
    submissionCount = 0,
  ) {
    const attachments = this.mapAttachments(
      'DELIVERABLE',
      item.id,
      item.attachmentUrl,
      attachmentMap,
    );

    const now = new Date();
    const submissionOpen =
      item.isActive &&
      item.submissionsOpen &&
      now <= item.dueDate &&
      latestSubmission?.status !== 'APPROVED' &&
      latestSubmission?.status !== 'FINALIZED';

    return {
      ...item,
      preview: this.previewText(item.description),
      teamName: teamName ?? null,
      attachmentCount: attachments.length,
      commentCount:
        commentCounts.get(
          this.entityKey('DELIVERABLE', item.id),
        ) ?? 0,
      attachments,
      latestSubmissionStatus: latestSubmission?.status ?? null,
      submissionCount,
      submissionOpen,
      submissionClosedReason: submissionOpen
        ? null
        : !item.isActive
          ? 'INACTIVE'
          : !item.submissionsOpen
            ? 'CLOSED'
            : now > item.dueDate
              ? 'PAST_DUE'
              : latestSubmission?.status === 'APPROVED' ||
                  latestSubmission?.status === 'FINALIZED'
                ? latestSubmission.status
                : 'CLOSED',
    };
  }
}
