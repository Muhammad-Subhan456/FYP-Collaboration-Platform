import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { CreateWorkStreamCommentDto } from './dto/create-comment.dto';
import { WorkStreamService } from './work-stream.service';

@Controller('work-stream')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkStreamController {
  constructor(
    private readonly workStreamService: WorkStreamService,
  ) {}

  @Roles('STUDENT', 'SUPERVISOR')
  @Post('comments')
  createComment(
    @Req() req: { user: { userId: string; role: string } },
    @Body() dto: CreateWorkStreamCommentDto,
  ) {
    return this.workStreamService.createComment(
      req.user.userId,
      req.user.role,
      dto,
    );
  }
}
