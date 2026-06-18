import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateOwnProfileDto } from './dto/create-own-profile.dto';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('me')
  createMyProfile(
    @Req() req: any,
    @Body() createProfileDto: CreateOwnProfileDto,
  ) {
    return this.profilesService.createOwnProfile(
      req.user.userId,
      createProfileDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.profilesService.getMyProfile(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':authUserId')
  findOne(
    @Param('authUserId') authUserId: string,
  ) {
    return this.profilesService.findOne(
      authUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.updateMyProfile(
      req.user.userId,
      updateProfileDto,
    );
  }
}
