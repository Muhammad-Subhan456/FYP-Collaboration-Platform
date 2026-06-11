import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { CreateOwnProfileDto } from './dto/create-own-profile.dto';
import { BadRequestException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createProfileDto: CreateProfileDto,
  ) {
    const profile =
      await this.prisma.userProfile.create({
        data: createProfileDto,
      });

    return profile;
  }

  async findOne(authUserId: string) {
    return this.prisma.userProfile.findUnique({
      where: {
        authUserId,
      },
    });
  }

async createOwnProfile(
  authUserId: string,
  createProfileDto: CreateOwnProfileDto,
) {
  const existingProfile =
    await this.prisma.userProfile.findUnique({
      where: {
        authUserId,
      },
    });

  if (existingProfile) {
    throw new BadRequestException(
      'Profile already exists',
    );
  }

  return this.prisma.userProfile.create({
    data: {
      authUserId,
      ...createProfileDto,
    },
  });
}
async getMyProfile(authUserId: string) {
  return this.prisma.userProfile.findUnique({
    where: {
      authUserId,
    },
  });
}

async updateMyProfile(
  authUserId: string,
  updateProfileDto: UpdateProfileDto,
) {
  return this.prisma.userProfile.update({
    where: {
      authUserId,
    },
    data: updateProfileDto,
  });
}

}