import axios from 'axios';

import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('teams')
export class TeamsController {

  @UseGuards(JwtAuthGuard)
  @Get('my-team')
  async getMyTeam(
    @Headers('authorization')
    authorization: string,
  ) {
    const response =
      await axios.get(
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
  @Get('my-team/members')
  async getMyTeamMembers(
    @Headers('authorization')
    authorization: string,
  ) {
    const response =
      await axios.get(
        `${process.env.TEAM_SERVICE_URL}/teams/my-team/members`,
        {
          headers: {
            Authorization: authorization,
          },
        },
      );

    return response.data;
  }
}