import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { CreateSupervisorProfileDto } from './dto/create-supervisor-profile.dto';
import { CreateCoordinatorProfileDto } from './dto/create-coordinator-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ActivityLogsService } from '../progress/activity-logs/activity-logs.service';
import { getWorkspaceIdFromContext } from '../workspace/workspace-als';

type UserRole = 'STUDENT' | 'SUPERVISOR' | 'COORDINATOR' | 'EVALUATOR';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private async assertValidStudentUpdate(
    data: Record<string, unknown>,
  ): Promise<UpdateStudentProfileDto> {
    const { email: _ignored, ...rest } = data;
    const dto = plainToInstance(UpdateStudentProfileDto, rest, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );
      throw new BadRequestException(
        messages.length > 0 ? messages : 'Invalid profile data',
      );
    }

    return dto;
  }

  async findOne(authUserId: string) {
    return this.prisma.userProfile.findUnique({
      where: { authUserId },
    });
  }

  private async canSupervisorViewStudent(
    supervisorId: string,
    studentAuthUserId: string,
  ) {
    const scopedWorkspaceId = getWorkspaceIdFromContext();

    const supervised = await this.prisma.proposal.findFirst({
      where: {
        assignedSupervisorId: supervisorId,
        status: {
          in: ['SUPERVISOR_ASSIGNED', 'APPROVED'],
        },
        team: {
          members: { some: { authUserId: studentAuthUserId } },
          ...(scopedWorkspaceId
            ? { workspaceId: scopedWorkspaceId }
            : {}),
        },
      },
      select: { id: true },
    });

    return Boolean(supervised);
  }

  async findOneForRequester(
    authUserId: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    if (requesterId !== authUserId) {
      const target = await this.findOne(authUserId);

      if (
        (target?.profileType === 'SUPERVISOR' ||
          target?.profileType === 'EVALUATOR') &&
        (requesterRole === 'STUDENT' || requesterRole === 'SUPERVISOR')
      ) {
        return target;
      }

      if (
        requesterRole === 'SUPERVISOR' &&
        target?.profileType === 'STUDENT' &&
        (await this.canSupervisorViewStudent(requesterId, authUserId))
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

  async findManyByAuthUserIds(
    authUserIds: string[],
    workspaceId?: string,
  ) {
    const uniqueIds = [...new Set(authUserIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return {};
    }

    let allowedIds = uniqueIds;
    if (workspaceId) {
      const members = await this.prisma.workspaceMembership.findMany({
        where: {
          workspaceId,
          isActive: true,
          userId: { in: uniqueIds },
        },
        select: { userId: true },
      });
      const memberSet = new Set(members.map((member) => member.userId));
      allowedIds = uniqueIds.filter((id) => memberSet.has(id));
    }

    if (allowedIds.length === 0) {
      return {};
    }

    const profiles = await this.prisma.userProfile.findMany({
      where: {
        authUserId: { in: allowedIds },
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

    const account = await this.prisma.user.findUnique({
      where: { id: authUserId },
      select: { email: true },
    });

    if (!account?.email) {
      throw new BadRequestException('Authenticated account email is required');
    }

    const profile = await this.prisma.userProfile.create({
      data: {
        authUserId,
        profileType: 'STUDENT',
        fullName: dto.fullName,
        email: account.email,
        profilePicture: dto.profilePicture,
        registrationNumber: dto.registrationNumber,
        department: dto.department,
        batch: dto.batch,
        degreeProgram: dto.degreeProgram,
        semester: dto.semester,
        cgpa: dto.cgpa ?? null,
        phone: dto.phone || null,
        skills: dto.skills ?? [],
        interests: dto.interests ?? [],
        linkedIn: dto.linkedIn || null,
        github: dto.github || null,
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

  async createEvaluatorProfile(
    authUserId: string,
    role: UserRole,
    dto: CreateSupervisorProfileDto,
  ) {
    if (role !== 'EVALUATOR') {
      throw new ForbiddenException(
        'Only evaluators can create an evaluator profile',
      );
    }

    await this.assertNoProfile(authUserId);

    const profile = await this.prisma.userProfile.create({
      data: {
        authUserId,
        profileType: 'EVALUATOR',
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
      'Evaluator Profile Completed',
      `${dto.fullName} completed their FOASIS evaluator profile.`,
    );

    await this.notificationDispatch.send({
      authUserId,
      title: 'Profile Complete',
      message: 'Your FOASIS evaluator profile has been saved successfully.',
      type: 'PROFILE_COMPLETED',
      route: '/evaluator/dashboard',
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
    role: string,
    data: Record<string, unknown>,
  ) {
    const existing = await this.findOne(authUserId);
    if (!existing) {
      throw new BadRequestException('Profile not found');
    }

    // Evaluators commonly share a SUPERVISOR profile (dual membership).
    const roleMatchesProfile =
      existing.profileType === role ||
      (role === 'EVALUATOR' && existing.profileType === 'SUPERVISOR');

    if (!roleMatchesProfile) {
      throw new ForbiddenException(
        'Profile type does not match your role',
      );
    }

    const updateData =
      existing.profileType === 'STUDENT'
        ? await this.assertValidStudentUpdate(data)
        : data;

    const { email: _ignoredEmail, ...safeUpdate } =
      updateData as Record<string, unknown> & { email?: unknown };

    const profile = await this.prisma.userProfile.update({
      where: { authUserId },
      data: safeUpdate as object,
    });

    if (
      typeof safeUpdate.fullName === 'string' &&
      safeUpdate.fullName.trim() &&
      safeUpdate.fullName !== existing.fullName
    ) {
      await this.prisma.user.update({
        where: { id: authUserId },
        data: { fullName: safeUpdate.fullName.trim() },
      });
    }

    try {
      await this.activityLogsService.logActivity(
        authUserId,
        'Profile Updated',
        `${profile.fullName} updated their FOASIS profile.`,
      );
    } catch (error) {
      // Profile write already succeeded — never fail the request on logging.
      console.warn(
        'Failed to write profile-update activity log',
        error instanceof Error ? error.message : error,
      );
    }

    return profile;
  }
}
