import axios from 'axios';

import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {

  @UseGuards(JwtAuthGuard)
  @Get()
  async getDashboard(
    @Headers('authorization')
    authorization: string,
  ) {

    const profileResponse =
      await axios.get(
        `${process.env.USER_SERVICE_URL}/profiles/me`,
        {
          headers: {
            Authorization:
              authorization,
          },
        },
      );

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

    let proposal = null;

    try {
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

      proposal =
        proposalResponse.data;

    } catch {
      proposal = null;
    }

    return {
      profile:
        profileResponse.data,

      team,

      proposal,
    };
  }
}