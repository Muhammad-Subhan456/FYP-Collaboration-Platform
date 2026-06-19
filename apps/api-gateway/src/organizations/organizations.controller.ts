import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';

import { GatewayHttpService } from '../common/gateway-http.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('organizations')
export class OrganizationsGatewayController {
  constructor(
    private readonly gatewayHttpService: GatewayHttpService,
  ) {}

  @Get('plans')
  getPlans() {
    return this.gatewayHttpService.get(
      `${process.env.AUTH_SERVICE_URL}/organizations/plans`,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyOrganization(
    @Headers('authorization') authorization: string,
  ) {
    return this.gatewayHttpService.get(
      `${process.env.AUTH_SERVICE_URL}/organizations/me`,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.gatewayHttpService.post(
      `${process.env.AUTH_SERVICE_URL}/organizations/subscribe`,
      body,
      authorization,
    );
  }
}
