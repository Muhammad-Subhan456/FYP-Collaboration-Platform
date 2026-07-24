import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { SkipWorkspace } from '../common/decorators/skip-workspace.decorator';
import { securityConfig } from '../common/security.config';

import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationsService } from './invitations.service';

@SkipWorkspace()
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
  ) {}

  @Throttle({
    default: {
      limit: securityConfig.invitationRateLimit,
      ttl: securityConfig.invitationRateTtlMs,
    },
  })
  @Get('verify')
  verify(@Query('token') token: string) {
    return this.invitationsService.verifyInvitationToken(token);
  }

  @Throttle({
    default: {
      limit: securityConfig.invitationRateLimit,
      ttl: securityConfig.invitationRateTtlMs,
    },
  })
  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(
      dto.token,
      dto.fullName,
      dto.password,
    );
  }
}
