import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { InvitationsService } from '../invitations/invitations.service';

import { InviteUserDto } from './dto/invite-user.dto';

type CoordinatorRequest = {
  user: { userId: string };
  workspaceId: string;
};

@Controller('coordinator/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COORDINATOR')
export class CoordinatorUsersController {
  constructor(
    private readonly invitationsService: InvitationsService,
  ) {}

  @Get('invitations')
  listInvitations(@Req() req: CoordinatorRequest) {
    return this.invitationsService.listWorkspaceInvitations(
      req.workspaceId,
    );
  }

  @Post('invite')
  inviteUser(
    @Req() req: CoordinatorRequest,
    @Body() dto: InviteUserDto,
  ) {
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Invalid role');
    }

    return this.invitationsService.createInvitation(
      req.workspaceId,
      req.user.userId,
      dto,
    );
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(
    @Req() req: CoordinatorRequest,
    @UploadedFile() file?: Express.Multer.File,
    @Body('csv') csvBody?: string,
  ) {
    const csvContent =
      file?.buffer?.toString('utf-8') ?? csvBody ?? '';

    if (!csvContent.trim()) {
      throw new BadRequestException('CSV content is required');
    }

    return this.invitationsService.importFromCsv(
      req.workspaceId,
      req.user.userId,
      csvContent,
    );
  }

  @Post('invitations/:invitationId/resend')
  resendInvitation(
    @Req() req: CoordinatorRequest,
    @Param('invitationId') invitationId: string,
  ) {
    return this.invitationsService.resendInvitation(
      req.workspaceId,
      invitationId,
      req.user.userId,
    );
  }
}
