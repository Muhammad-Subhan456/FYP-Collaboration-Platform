import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SubscribeOrganizationDto } from './dto/subscribe-organization.dto';

const PLAN_CATALOG = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 4,
    teamLimit: 10,
    storageLimitGb: 5,
    analyticsAccess: false,
    features: [
      'Up to 10 project teams',
      'Core collaboration tools',
      'Email notifications',
      '5 GB document storage',
    ],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 9,
    teamLimit: 50,
    storageLimitGb: 25,
    analyticsAccess: true,
    features: [
      'Up to 50 project teams',
      'Advanced evaluations workflow',
      'Priority notifications',
      '25 GB document storage',
      'Coordinator analytics dashboard',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 14,
    teamLimit: 500,
    storageLimitGb: 200,
    analyticsAccess: true,
    features: [
      'Unlimited-scale team management',
      'Dedicated success support',
      'Custom branding options',
      '200 GB document storage',
      'Full analytics and reporting',
    ],
  },
] as const;

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  getPlans() {
    return PLAN_CATALOG;
  }

  getMyOrganization(ownerId: string) {
    return this.prisma.organization.findFirst({
      where: { ownerId },
      orderBy: { subscribedAt: 'desc' },
    });
  }

  async subscribe(ownerId: string, dto: SubscribeOrganizationDto) {
    const slug = dto.organizationName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existing && existing.ownerId && existing.ownerId !== ownerId) {
      return this.prisma.organization.update({
        where: { id: existing.id },
        data: {
          plan: dto.plan,
          isActive: true,
          subscribedAt: new Date(),
        },
      });
    }

    return this.prisma.organization.upsert({
      where: { slug },
      create: {
        name: dto.organizationName.trim(),
        slug,
        plan: dto.plan,
        isActive: true,
        subscribedAt: new Date(),
        ownerId,
      },
      update: {
        name: dto.organizationName.trim(),
        plan: dto.plan,
        isActive: true,
        subscribedAt: new Date(),
        ownerId,
      },
    });
  }
}
