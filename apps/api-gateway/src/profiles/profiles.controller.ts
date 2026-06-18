import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GatewayHttpService } from '../common/gateway-http.service';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('me')
  createMyProfile(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.USER_SERVICE_URL}/profiles/me`,
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.USER_SERVICE_URL}/profiles/me`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      `${process.env.USER_SERVICE_URL}/profiles/me`,
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':authUserId')
  getProfileById(
    @Headers('authorization') authorization: string,
    @Param('authUserId') authUserId: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.USER_SERVICE_URL}/profiles/${authUserId}`,
      authorization,
    );
  }
}
