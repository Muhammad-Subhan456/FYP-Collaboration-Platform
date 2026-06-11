import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createTeam(
    @Req() req: any,
    @Body() createTeamDto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(
      req.user.userId,
      createTeamDto,
    );
  }
}