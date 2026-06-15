import {
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createTask(
    dto: CreateTaskDto,
  ) {
    return this.prisma.task.create({
      data: {
        milestoneId:
          dto.milestoneId,

        title:
          dto.title,

        description:
          dto.description,

        assignedTo:
          dto.assignedTo,

        dueDate:
          dto.dueDate
            ? new Date(dto.dueDate)
            : null,
      },
    });
  }

  async getMilestoneTasks(
    milestoneId: string,
  ) {
    return this.prisma.task.findMany({
      where: {
        milestoneId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyTasks(
    authUserId: string,
  ) {
    return this.prisma.task.findMany({
      where: {
        assignedTo:
          authUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateTaskStatus(
    taskId: string,
    dto: UpdateTaskStatusDto,
  ) {
    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status:
          dto.status as any,
      },
    });
  }
}