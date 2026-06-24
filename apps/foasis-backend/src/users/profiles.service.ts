import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { CreateSupervisorProfileDto } from './dto/create-supervisor-profile.dto';
import { CreateCoordinatorProfileDto } from './dto/create-coordinator-profile.dto';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ActivityLogsService } from '../progress/activity-logs/activity-logs.service';

type UserRole = 'STUDENT' | 'SUPERVISOR' | 'COORDINATOR';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findOne(authUserId: string) {
    return this.prisma.userProfile.findUnique({
      where: { authUserId },
    });
  }

  async findOneForRequester(
    authUserId: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    if (requesterId !== authUserId) {
      const target = await this.findOne(authUserId);

      if (
        target?.profileType === 'SUPERVISOR' &&
        (requesterRole === 'STUDENT' || requesterRole === 'SUPERVISOR')
      ) {
        return target;
      }

      if (requesterRole !== 'COORDINATOR') {
        throw new ForbiddenException(
          'You can only view your own profile',
        );
      }
    }

    const profile = await this.findOne(authUserId);

    if (!profile) {
      throw new BadRequestException('Profile not found');
    }

    return profile;
  }

  async getMyProfile(authUserId: string) {
    return this.findOne(authUserId);
  }

  async findManyByAuthUserIds(authUserIds: string[]) {
    const profiles = await this.prisma.userProfile.findMany({
      where: {
        authUserId: { in: authUserIds },
      },
    });

    return profiles.reduce(
      (acc, profile) => {
        acc[profile.authUserId] = profile;
        return acc;
      },
      {} as Record<string, (typeof profiles)[number]>,
    );
  }

  private async assertNoProfile(authUserId: string) {
    const existing = await this.findOne(authUserId);
    if (existing) {
      throw new BadRequestException('Profile already exists');
    }
  }

  async createStudentProfile(
    authUserId: string,
    role: UserRole,
    dto: CreateStudentProfileDto,
  ) {
    if (role !== 'STUDENT') {
      throw new ForbiddenException(
        'Only students can create a student profile',
      );
    }

    await this.assertNoProfile(authUserId);

    const profile = await this.prisma.userProfile.create({
      data: {
        authUserId,
        profileType: 'STUDENT',
        fullName: dto.fullName,
        email: dto.email,
        profilePicture: dto.profilePicture,
        registrationNumber: dto.registrationNumber,
        department: dto.department,
        batch: dto.batch,
        degreeProgram: dto.degreeProgram,
        semester: dto.semester,
        skills: dto.skills ?? [],
        interests: dto.interests ?? [],
        linkedIn: dto.linkedIn,
        github: dto.github,
        bio: dto.bio,
      },
    });

    await this.activityLogsService.logActivity(
      authUserId,
      'Student Profile Completed',
      `${dto.fullName} completed their FOASIS student profile.`,
    );

    await this.notificationDispatch.send({
      authUserId,
      title: 'Profile Complete',
      message: 'Your FOASIS student profile has been saved successfully.',
      type: 'PROFILE_COMPLETED',
      route: '/student/dashboard',
    });

    return profile;
  }

  async createSupervisorProfile(
    authUserId: string,
    role: UserRole,
    dto: CreateSupervisorProfileDto,
  ) {
    if (role !== 'SUPERVISOR') {
      throw new ForbiddenException(
        'Only supervisors can create a supervisor profile',
      );
    }

    await this.assertNoProfile(authUserId);

    const profile = await this.prisma.userProfile.create({
      data: {
        authUserId,
        profileType: 'SUPERVISOR',
        fullName: dto.fullName,
        email: dto.email,
        profilePicture: dto.profilePicture,
        facultyId: dto.facultyId,
        department: dto.department,
        designation: dto.designation,
        researchAreas: dto.researchAreas ?? [],
        publications: dto.publications ?? [],
        officeLocation: dto.officeLocation,
        officeHours: dto.officeHours,
        linkedIn: dto.linkedIn,
        googleScholar: dto.googleScholar,
        biography: dto.biography,
      },
    });

    await this.activityLogsService.logActivity(
      authUserId,
      'Supervisor Profile Completed',
      `${dto.fullName} completed their FOASIS supervisor profile.`,
    );

    await this.notificationDispatch.send({
      authUserId,
      title: 'Profile Complete',
      message: 'Your FOASIS supervisor profile has been saved successfully.',
      type: 'PROFILE_COMPLETED',
      route: '/supervisor/dashboard',
    });

    return profile;
  }

  async createCoordinatorProfile(
    authUserId: string,
    role: UserRole,
    dto: CreateCoordinatorProfileDto,
  ) {
    if (role !== 'COORDINATOR') {
      throw new ForbiddenException(
        'Only coordinators can create a coordinator profile',
      );
    }

    await this.assertNoProfile(authUserId);

    return this.prisma.userProfile.create({
      data: {
        authUserId,
        profileType: 'COORDINATOR',
        fullName: dto.fullName,
        email: dto.email,
        profilePicture: dto.profilePicture,
        facultyId: dto.facultyId,
        department: dto.department,
        designation: dto.designation,
        coordinatorRole: dto.coordinatorRole,
        officeLocation: dto.officeLocation,
        contactInformation: dto.contactInformation,
        biography: dto.biography,
      },
    });
  }

  async updateMyProfile(
    authUserId: string,
    role: UserRole,
    data: Record<string, unknown>,
  ) {
    const existing = await this.findOne(authUserId);
    if (!existing) {
      throw new BadRequestException('Profile not found');
    }

    if (existing.profileType !== role) {
      throw new ForbiddenException(
        'Profile type does not match your role',
      );
    }

    const profile = await this.prisma.userProfile.update({
      where: { authUserId },
      data: data as any,
    });

    await this.activityLogsService.logActivity(
      authUserId,
      'Profile Updated',
      `${profile.fullName} updated their FOASIS profile.`,
    );

    return profile;
  }
}
