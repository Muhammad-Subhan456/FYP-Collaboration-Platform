import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { getWorkspaceIdFromContext } from '../../workspace/workspace-als';

import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@Injectable()
export class ActivityLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private requireWorkspaceId(): string {
    const workspaceId = getWorkspaceIdFromContext();
    if (!workspaceId) {
      throw new Error('Workspace context missing');
    }
    return workspaceId;
  }

  async createLog(
    dto: CreateActivityLogDto,
  ) {
    return this.prisma.activityLog.create({
      data: {
        workspaceId: this.requireWorkspaceId(),
        authUserId: dto.authUserId,

        title: dto.title,

        description: dto.description,
      },
    });
  }

  async getMyLogs(
    authUserId: string,
  ) {
    return this.prisma.activityLog.findMany({
      where: {
        authUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  async logActivity(
  authUserId: string,
  title: string,
  description?: string,
) {
  return this.prisma.activityLog.create({
    data: {
      workspaceId: this.requireWorkspaceId(),
      authUserId,
      title,
      description,
    },
  });
}

}