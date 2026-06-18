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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { TasksService } from './tasks.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService:
      TasksService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Post()
  createTask(
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService
      .createTask(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('milestone/:id')
  getMilestoneTasks(
    @Param('id') milestoneId: string,
  ) {
    return this.tasksService
      .getMilestoneTasks(
        milestoneId,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyTasks(
    @Req() req: any,
  ) {
    return this.tasksService
      .getMyTasks(
        req.user.userId,
      );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateTaskStatus(
    @Req() req: any,
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService
      .updateTaskStatus(
        taskId,
        dto,
        req.user.userId,
        req.user.role,
      );
  }
}
