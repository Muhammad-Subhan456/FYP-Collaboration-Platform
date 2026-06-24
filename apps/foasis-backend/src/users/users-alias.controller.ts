import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { ProfilesService } from './profiles.service';

/** Gateway-compatible alias for GET /users/profile → profiles/me */
@Controller('users')
export class UsersAliasController {
  constructor(
    private readonly profilesService: ProfilesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: { user: { userId: string } }) {
    return this.profilesService.getMyProfile(req.user.userId);
  }
}
