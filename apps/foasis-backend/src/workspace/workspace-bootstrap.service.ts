import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(
    WorkspaceBootstrapService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config
      .get<string>('SUPER_ADMIN_EMAIL')
      ?.trim()
      .toLowerCase();

    if (!email) {
      return;
    }

    const password = this.config.get<string>(
      'SUPER_ADMIN_PASSWORD',
    );
    const fullName =
      this.config.get<string>('SUPER_ADMIN_NAME') ??
      'Super Admin';

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.role !== UserRole.SUPER_ADMIN) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: UserRole.SUPER_ADMIN },
        });
        this.logger.log(
          `Promoted existing user ${email} to SUPER_ADMIN`,
        );
      }
      return;
    }

    if (!password) {
      this.logger.warn(
        `SUPER_ADMIN_EMAIL is set but SUPER_ADMIN_PASSWORD is missing — skipping bootstrap`,
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
      },
    });

    this.logger.log(`Bootstrapped Super Admin user ${email}`);
  }
}
