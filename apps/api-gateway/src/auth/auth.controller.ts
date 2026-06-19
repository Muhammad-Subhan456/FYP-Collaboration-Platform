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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  @Post('register')
  register(@Body() body: any) {
    return this.gatewayHttpService.post(
      `${process.env.AUTH_SERVICE_URL}/auth/register`,
      body,
    );
  }

  @Post('login')
  login(@Body() body: any) {
    return this.gatewayHttpService.post(
      `${process.env.AUTH_SERVICE_URL}/auth/login`,
      body,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('supervisors')
  listSupervisors(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.AUTH_SERVICE_URL}/auth/supervisors`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  listUsers(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.AUTH_SERVICE_URL}/auth/users`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/:userId/role')
  updateUserRole(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      `${process.env.AUTH_SERVICE_URL}/auth/users/${userId}/role`,
      body,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/:userId/status')
  updateUserStatus(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.gatewayHttpService.patch(
      `${process.env.AUTH_SERVICE_URL}/auth/users/${userId}/status`,
      body,
      authorization,
    );
  }
}
