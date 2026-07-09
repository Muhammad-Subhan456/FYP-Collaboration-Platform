import { Module } from '@nestjs/common';

import { AppUrlsService } from '../common/app-urls.service';

import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService, AppUrlsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
