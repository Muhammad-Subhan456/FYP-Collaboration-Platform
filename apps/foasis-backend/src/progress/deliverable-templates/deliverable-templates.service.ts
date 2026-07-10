import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

import { AuthService } from '../../auth/auth.service';
import { DomainEvents } from '../../domain-events/domain-event.constants';
import { DomainEventService } from '../../domain-events/domain-event.service';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { GpaCalculationService } from '../gpa/gpa-calculation.service';

import { CreateDeliverableTemplateDto } from './dto/create-deliverable-template.dto';
import { UpdateDeliverableTemplateDto } from './dto/update-deliverable-template.dto';
import { validateRubricCriteria } from './rubric.validation';

const templateInclude = {
  phase: true,
  rubricCriteria: { orderBy: { sortOrder: 'asc' as const } },
  attachments: true,
  _count: { select: { deliverables: true } },
};

@Injectable()
export class DeliverableTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly domainEventService: DomainEventService,
    private readonly gpaCalculationService: GpaCalculationService,
  ) {}

  listTemplates(workspaceId: string, phaseId?: string) {
    return this.prisma.deliverableTemplate.findMany({
      where: {
        workspaceId,
        ...(phaseId ? { phaseId } : {}),
      },
      include: templateInclude,
      orderBy: [{ phase: { sortOrder: 'asc' } }, { createdAt: 'desc' }],
    });
  }

  async getTemplate(templateId: string) {
    const template = await this.prisma.deliverableTemplate.findFirst({
      where: { id: templateId },
      include: templateInclude,
    });

    if (!template) {
      throw new NotFoundException('Deliverable template not found');
    }

    return template;
  }

  private parseDueDate(value?: string | null) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid due date');
    }

    return parsed;
  }

  private assertEditable(template: { isLocked: boolean }) {
    if (template.isLocked) {
      throw new BadRequestException(
        'This template is locked because it has been published by supervisors',
      );
    }
  }

  async createTemplate(
    workspaceId: string,
    coordinatorId: string,
    dto: CreateDeliverableTemplateDto,
  ) {
    try {
      validateRubricCriteria(dto.rubricCriteria, dto.totalMarks);
    } catch (error: unknown) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid rubric',
      );
    }

    const phase = await this.prisma.phase.findFirst({
      where: { id: dto.phaseId, workspaceId },
    });

    if (!phase) {
      throw new BadRequestException('Phase not found in this workspace');
    }

    const template = await this.prisma.deliverableTemplate.create({
      data: {
        workspaceId,
        phaseId: dto.phaseId,
        coordinatorId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        type: dto.type,
        dueDate: this.parseDueDate(dto.dueDate),
        totalMarks: dto.totalMarks,
        weightagePercent: dto.weightagePercent ?? 0,
        rubricCriteria: {
          create: dto.rubricCriteria.map((criterion, index) => ({
            id: randomUUID(),
            title: criterion.title.trim(),
            description: criterion.description?.trim() || null,
            maxMarks: criterion.maxMarks,
            sortOrder: criterion.sortOrder ?? index,
          })),
        },
        attachments: dto.attachments?.length
          ? {
              create: dto.attachments.map((attachment) => ({
                id: randomUUID(),
                fileUrl: attachment.fileUrl,
                fileName: attachment.fileName,
              })),
            }
          : undefined,
      },
      include: templateInclude,
    });

    await this.notifySupervisorsOfTemplate(workspaceId, template);

    await this.activityLogsService.logActivity(
      coordinatorId,
      'Deliverable Template Created',
      template.title,
    );

    this.domainEventService.emitSafe({
      name: DomainEvents.DELIVERABLE_TEMPLATE_CREATED,
      timestamp: new Date().toISOString(),
      actorId: coordinatorId,
      scope: { type: 'workspace', id: workspaceId },
      entity: { type: 'DELIVERABLE_TEMPLATE', id: template.id },
      payload: {
        template: {
          id: template.id,
          title: template.title,
          phaseId: template.phaseId,
          phaseName: template.phase.name,
        },
      },
    });

    return template;
  }

  async updateTemplate(
    templateId: string,
    dto: UpdateDeliverableTemplateDto,
  ) {
    const template = await this.getTemplate(templateId);
    this.assertEditable(template);

    const totalMarks = dto.totalMarks ?? template.totalMarks;
    const criteria =
      dto.rubricCriteria ??
      template.rubricCriteria.map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
        description: criterion.description ?? undefined,
        maxMarks: criterion.maxMarks,
        sortOrder: criterion.sortOrder,
      }));

    try {
      validateRubricCriteria(criteria, totalMarks);
    } catch (error: unknown) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid rubric',
      );
    }

    if (dto.phaseId && dto.phaseId !== template.phaseId) {
      const phase = await this.prisma.phase.findFirst({
        where: {
          id: dto.phaseId,
          workspaceId: template.workspaceId,
        },
      });

      if (!phase) {
        throw new BadRequestException('Phase not found in this workspace');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.rubricCriteria) {
        await tx.rubricCriterion.deleteMany({
          where: { templateId },
        });
      }

      if (dto.attachments) {
        await tx.deliverableTemplateAttachment.deleteMany({
          where: { templateId },
        });
      }

      await tx.deliverableTemplate.update({
        where: { id: templateId },
        data: {
          ...(dto.phaseId !== undefined && { phaseId: dto.phaseId }),
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.description !== undefined && {
            description: dto.description.trim(),
          }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.dueDate !== undefined && {
            dueDate: this.parseDueDate(dto.dueDate),
          }),
          ...(dto.totalMarks !== undefined && {
            totalMarks: dto.totalMarks,
          }),
          ...(dto.weightagePercent !== undefined && {
            weightagePercent: dto.weightagePercent,
          }),
          ...(dto.rubricCriteria && {
            rubricCriteria: {
              create: dto.rubricCriteria.map((criterion, index) => ({
                id: randomUUID(),
                title: criterion.title.trim(),
                description: criterion.description?.trim() || null,
                maxMarks: criterion.maxMarks,
                sortOrder: criterion.sortOrder ?? index,
              })),
            },
          }),
          ...(dto.attachments && {
            attachments: {
              create: dto.attachments.map((attachment) => ({
                id: randomUUID(),
                fileUrl: attachment.fileUrl,
                fileName: attachment.fileName,
              })),
            },
          }),
        },
      });
    });

    const updatedTemplate = await this.getTemplate(templateId);
    if (
      dto.weightagePercent !== undefined &&
      updatedTemplate.phase.isConfigurationPublished
    ) {
      await this.gpaCalculationService.recalculateForPhase(
        updatedTemplate.workspaceId,
        updatedTemplate.phaseId,
      );
    }

    return updatedTemplate;
  }

  async deleteTemplate(templateId: string) {
    const template = await this.getTemplate(templateId);
    this.assertEditable(template);

    if (template._count.deliverables > 0) {
      throw new BadRequestException(
        'Cannot delete a template that has published deliverables',
      );
    }

    await this.prisma.deliverableTemplate.delete({
      where: { id: templateId },
    });

    return { success: true };
  }

  async lockTemplate(templateId: string) {
    const result = await this.prisma.deliverableTemplate.updateMany({
      where: { id: templateId },
      data: { isLocked: true },
    });

    if (result.count === 0) {
      throw new NotFoundException('Deliverable template not found');
    }
  }

  private async notifySupervisorsOfTemplate(
    workspaceId: string,
    template: {
      id: string;
      title: string;
      phase: { name: string };
    },
  ) {
    const members =
      await this.authService.listActiveUserIds(workspaceId);
    const supervisors = members.filter(
      (member) => member.role === UserRole.SUPERVISOR,
    );

    if (!supervisors.length) {
      return;
    }

    await this.notificationDispatch.sendBulk(
      supervisors.map((supervisor) => ({
        authUserId: supervisor.id,
        title: 'New Deliverable Template',
        message: `${template.title} (${template.phase.name}) is available to publish.`,
        type: 'DELIVERABLE_TEMPLATE_CREATED',
        entityType: 'DELIVERABLE_TEMPLATE',
        entityId: template.id,
        route: '/supervisor/work-stream?tab=templates',
      })),
    );
  }
}
