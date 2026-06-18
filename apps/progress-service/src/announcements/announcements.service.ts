import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { TeamAccessService } from '../common/team-access.service';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamAccessService: TeamAccessService,
  ) {}

  async createAnnouncement(
    supervisorId: string,
    dto: CreateAnnouncementDto,
  ) {
    return this.prisma.announcement.create({
      data: {
        supervisorId,
        title: dto.title,
        message: dto.message,
        type: (dto.type as any) ?? 'GENERAL',
        dueDate: dto.dueDate,
      },
    });
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

    if (!supervisorId) {
      throw new BadRequestException(
        'No supervisor assigned to your team yet',
      );
    }

    return this.prisma.announcement.findMany({
      where: { supervisorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
