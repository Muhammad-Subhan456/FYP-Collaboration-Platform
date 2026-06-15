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

import { TasksService } from './tasks.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService:
      TasksService,
  ) {}

  @Post()
  createTask(
    @Body()
    dto: CreateTaskDto,
  ) {
    return this.tasksService
      .createTask(dto);
  }

  @Get('milestone/:id')
  getMilestoneTasks(
    @Param('id')
    milestoneId: string,
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

  @Patch(':id/status')
  updateTaskStatus(
    @Param('id')
    taskId: string,

    @Body()
    dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService
      .updateTaskStatus(
        taskId,
        dto,
      );
  }
}