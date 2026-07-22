import { Module, forwardRef } from '@nestjs/common';

import { DomainEventsModule } from '../domain-events/domain-events.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { TeamsModule } from '../teams/teams.module';

import { RealtimeEventDispatcher } from './realtime-event-dispatcher.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeRoomMembershipService } from './realtime-room-membership.service';
import { RealtimeRoomService } from './realtime-room.service';

@Module({
  imports: [
    DomainEventsModule,
    TeamsModule,
    forwardRef(() => ProposalsModule),
  ],
  providers: [
    RealtimeGateway,
    RealtimeRoomService,
    RealtimeEventDispatcher,
    RealtimeRoomMembershipService,
  ],
  exports: [RealtimeGateway, RealtimeRoomService],
})
export class RealtimeModule {}
