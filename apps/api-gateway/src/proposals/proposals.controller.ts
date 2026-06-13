import axios from 'axios';

import {
  Controller,
  Get,
  Headers,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('proposals')
export class ProposalsController {

  @UseGuards(JwtAuthGuard)
  @Get('my-proposal')
  async getMyProposal(
    @Query('teamId') teamId: string,

    @Headers('authorization')
    authorization: string,
  ) {
    const response =
      await axios.get(
        `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-proposal`,
        {
          params: {
            teamId,
          },

          headers: {
            Authorization:
              authorization,
          },
        },
      );

    return response.data;
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-invitations')
  async getMyInvitations(
    @Query('proposalId')
    proposalId: string,

    @Headers('authorization')
    authorization: string,
  ) {
    const response =
      await axios.get(
        `${process.env.PROPOSAL_SERVICE_URL}/proposals/my-invitations`,
        {
          params: {
            proposalId,
          },

          headers: {
            Authorization:
              authorization,
          },
        },
      );

    return response.data;
  }
}