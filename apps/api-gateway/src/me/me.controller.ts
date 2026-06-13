import axios from 'axios';

import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('me')
export class MeController {

  @UseGuards(JwtAuthGuard)
  @Get('team')
  async getMyTeam(
    @Headers('authorization')
    authorization: string,
  ) {
    const response = await axios.get(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
      {
        headers: {
          Authorization: authorization,
        },
      },
    );

    return response.data;
  }

@UseGuards(JwtAuthGuard)
@Get('proposal')
async getMyProposal(
  @Headers('authorization')
  authorization: string,
) {
  const teamResponse =
    await axios.get(
      `${process.env.TEAM_SERVICE_URL}/teams/my-team`,
      {
        headers: {
          Authorization:
            authorization,
        },
      },
    );

  const team =
    teamResponse.data;

  const proposalResponse =
    await axios.get(
      `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-proposal`,
      {
        params: {
          teamId: team.id,
        },

        headers: {
          Authorization:
            authorization,
        },
      },
    );

  return proposalResponse.data;
}

}