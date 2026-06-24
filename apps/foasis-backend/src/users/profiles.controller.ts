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

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { CreateSupervisorProfileDto } from './dto/create-supervisor-profile.dto';
import { CreateCoordinatorProfileDto } from './dto/create-coordinator-profile.dto';
import { BatchProfilesDto } from './dto/batch-profiles.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('me/student')
  createStudentProfile(
    @Req() req: any,
    @Body() dto: CreateStudentProfileDto,
  ) {
    return this.profilesService.createStudentProfile(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/supervisor')
  createSupervisorProfile(
    @Req() req: any,
    @Body() dto: CreateSupervisorProfileDto,
  ) {
    return this.profilesService.createSupervisorProfile(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/coordinator')
  createCoordinatorProfile(
    @Req() req: any,
    @Body() dto: CreateCoordinatorProfileDto,
  ) {
    return this.profilesService.createCoordinatorProfile(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.profilesService.getMyProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('batch')
  getBatchProfiles(@Body() dto: BatchProfilesDto) {
    return this.profilesService.findManyByAuthUserIds(dto.authUserIds);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':authUserId')
  findOne(@Req() req: any, @Param('authUserId') authUserId: string) {
    return this.profilesService.findOneForRequester(
      authUserId,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.profilesService.updateMyProfile(
      req.user.userId,
      req.user.role,
      body,
    );
  }
}
