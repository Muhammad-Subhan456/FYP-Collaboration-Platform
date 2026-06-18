import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly jwtService: JwtService,
) {}

  private notificationHeaders() {
    return {
      'X-Internal-Api-Key':
        process.env.INTERNAL_API_KEY,
    };
  }

  private async notifyUser(
    authUserId: string,
    title: string,
    message: string,
  ) {
    if (!process.env.NOTIFICATION_SERVICE_URL) {
      return;
    }

    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
        { authUserId, title, message },
        { headers: this.notificationHeaders() },
      );
    } catch (error) {
      console.error('Failed to create notification', error);
    }
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      10,
    );

    const user = await this.prisma.user.create({
      data: {
        fullName: registerDto.fullName,
        email: registerDto.email,
        passwordHash: hashedPassword,
        role: 'STUDENT',
      },
    });

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  }

  async login(email: string, password: string) {
  const user = await this.prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || !user.passwordHash) {
    throw new BadRequestException(
      'Invalid credentials',
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new BadRequestException(
      'Invalid credentials',
    );
  }

  if (!user.isActive) {
    throw new BadRequestException(
      'Your account has been disabled. Contact the coordinator.',
    );
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken:
      await this.jwtService.signAsync(payload),
  };
}

async getUserStats() {
  const totalStudents =
    await this.prisma.user.count({
      where: {
        role: 'STUDENT',
      },
    });

  const totalSupervisors =
    await this.prisma.user.count({
      where: {
        role: 'SUPERVISOR',
      },
    });

  const totalCoordinators =
    await this.prisma.user.count({
      where: {
        role: 'COORDINATOR',
      },
    });

  return {
    totalStudents,
    totalSupervisors,
    totalCoordinators,
  };
}

async listSupervisors() {
  return this.prisma.user.findMany({
    where: {
      role: 'SUPERVISOR',
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
    orderBy: {
      fullName: 'asc',
    },
  });
}

async listAllUsers() {
  return this.prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

async listActiveUserIds() {
  return this.prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
}

async updateUserRole(
  targetUserId: string,
  role: 'STUDENT' | 'SUPERVISOR' | 'COORDINATOR',
  coordinatorId: string,
) {
  if (targetUserId === coordinatorId) {
    throw new BadRequestException(
      'You cannot change your own role',
    );
  }

  const user = await this.prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  return this.prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  }).then(async (updated) => {
    await this.notifyUser(
      targetUserId,
      'FOASIS Role Updated',
      `Your account role has been updated to ${role}.`,
    );
    return updated;
  });
}

async updateUserStatus(
  targetUserId: string,
  isActive: boolean,
  coordinatorId: string,
) {
  if (targetUserId === coordinatorId) {
    throw new BadRequestException(
      'You cannot disable your own account',
    );
  }

  const user = await this.prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  return this.prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  }).then(async (updated) => {
    await this.notifyUser(
      targetUserId,
      'FOASIS Account Status Updated',
      isActive
        ? 'Your FOASIS account has been re-enabled.'
        : 'Your FOASIS account has been disabled. Contact the coordinator.',
    );
    return updated;
  });
}

}