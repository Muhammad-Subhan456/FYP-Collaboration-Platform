import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async createTask(dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        milestoneId: dto.milestoneId,

        title: dto.title,

        description: dto.description,

        assignedTo: dto.assignedTo,

        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    await this.activityLogsService.logActivity(
      task.assignedTo,
      'Task Assigned',
      task.title,
    );

    return task;
  }

  async getMilestoneTasks(milestoneId: string) {
    return this.prisma.task.findMany({
      where: {
        milestoneId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyTasks(authUserId: string) {
    return this.prisma.task.findMany({
      where: {
        assignedTo: authUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateTaskStatus(
    taskId: string,
    dto: UpdateTaskStatusDto,
    authUserId: string,
    role: string,
  ) {
    const existingTask = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });

    if (!existingTask) {
      throw new BadRequestException('Task not found');
    }

    if (
      role !== 'SUPERVISOR' &&
      existingTask.assignedTo !== authUserId
    ) {
      throw new ForbiddenException(
        'You can only update tasks assigned to you',
      );
    }

    const task = await this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: dto.status as any,
      },
    });

    await this.activityLogsService.logActivity(
      task.assignedTo,
      'Task Status Updated',
      dto.status,
    );
    return task;
  }
}
