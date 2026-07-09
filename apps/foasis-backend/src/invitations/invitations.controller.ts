import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';

import { SkipWorkspace } from '../common/decorators/skip-workspace.decorator';

import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationsService } from './invitations.service';

@SkipWorkspace()
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
  ) {}

  @Get('verify')
  verify(@Query('token') token: string) {
    return this.invitationsService.verifyInvitationToken(token);
  }

  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(
      dto.token,
      dto.fullName,
      dto.password,
    );
  }
}
