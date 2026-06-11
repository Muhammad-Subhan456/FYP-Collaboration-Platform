import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createTeam(
    leaderId: string,
    createTeamDto: CreateTeamDto,
  ) {

    const existingMembership =
      await this.prisma.teamMember.findUnique({
        where: {
          authUserId: leaderId!
        },
      });

    if (existingMembership) {
      throw new BadRequestException(
        'User already belongs to a team',
      );
    }

    const team =
      await this.prisma.team.create({
        data: {
          name: createTeamDto.name,
          domain: createTeamDto.domain,
          description:
            createTeamDto.description,
          maxMembers:
            createTeamDto.maxMembers,
          leaderId,
        },
      });

    await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        authUserId: leaderId,
      },
    });

    return team;
  }
}