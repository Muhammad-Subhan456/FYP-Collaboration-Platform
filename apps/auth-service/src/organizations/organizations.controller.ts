import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import { SubscribeOrganizationDto } from './dto/subscribe-organization.dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get('plans')
  getPlans() {
    return this.organizationsService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyOrganization(@Req() req: any) {
    return this.organizationsService.getMyOrganization(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(
    @Req() req: any,
    @Body() dto: SubscribeOrganizationDto,
  ) {
    return this.organizationsService.subscribe(
      req.user.userId,
      dto,
    );
  }
}
