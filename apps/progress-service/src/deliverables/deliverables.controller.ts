import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { DeliverablesService } from './deliverables.service';

import { CreateDeliverableDto } from './dto/create-deliverable.dto';

@Controller('deliverables')
export class DeliverablesController {
  constructor(
    private readonly deliverablesService:
      DeliverablesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createDeliverable(
    @Req() req: any,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.deliverablesService
      .createDeliverable(
        req.user.userId,
        dto,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyDeliverables(
    @Req() req: any,
  ) {
    return this.deliverablesService
      .getMyDeliverables(
        req.user.userId,
      );
  }
}