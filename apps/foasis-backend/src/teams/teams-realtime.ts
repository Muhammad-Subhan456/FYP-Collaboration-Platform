import type { JoinRequest, TeamMember } from '@prisma/client';

import type {
  JoinRequestWire,
  TeamMemberWire,
} from '../domain-events/domain-event.types';

export function serializeJoinRequest(
  request: JoinRequest,
): JoinRequestWire {
  return {
    id: request.id,
    teamId: request.teamId,
    authUserId: request.authUserId,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  };
}

export function serializeTeamMember(member: TeamMember): TeamMemberWire {
  return {
    id: member.id,
    teamId: member.teamId,
    authUserId: member.authUserId,
    teamRole: member.teamRole,
    joinedAt: member.joinedAt.toISOString(),
  };
}
