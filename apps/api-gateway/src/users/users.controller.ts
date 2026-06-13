import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { GatewayHttpService }
from '../common/gateway-http.service';

@Controller('users')
export class UsersController {

  constructor(
    private readonly gatewayHttpService:
      GatewayHttpService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @Headers('authorization')
    authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.USER_SERVICE_URL}/profiles/me`,
      authorization,
    );
  }
}