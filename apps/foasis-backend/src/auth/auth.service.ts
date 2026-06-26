import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import {
  buildRoleNotification,
} from '../common/helpers/notification-payload';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';

@Injectable()
export class AuthService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly jwtService: JwtService,
  private readonly notificationDispatch: NotificationDispatchService,
) {}

  private async notifyUser(
    authUserId: string,
    title: string,
    message: string,
    type: string,
    role: string,
  ) {
    await this.notificationDispatch.send(
      buildRoleNotification(
        authUserId,
        role,
        title,
        message,
        type,
      ),
    );
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
  const [
    totalStudents,
    totalSupervisors,
    totalCoordinators,
  ] = await Promise.all([
    this.prisma.user.count({
      where: { role: 'STUDENT' },
    }),
    this.prisma.user.count({
      where: { role: 'SUPERVISOR' },
    }),
    this.prisma.user.count({
      where: { role: 'COORDINATOR' },
    }),
  ]);

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
    select: { id: true, role: true },
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
      'ROLE_UPDATED',
      role,
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
      'ACCOUNT_STATUS_UPDATED',
      updated.role,
    );
    return updated;
  });
}

}