import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly jwtService: JwtService,
) {}

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
        role: registerDto.role,
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

}