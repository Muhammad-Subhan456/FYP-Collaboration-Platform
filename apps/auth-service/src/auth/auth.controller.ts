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

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
  ) {
    return this.authService.login(
      loginDto.email,
      loginDto.password,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @Get('student')
  studentRoute() {
    return {
      message: 'Welcome Student',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR')
  @Get('supervisor')
  supervisorRoute() {
    return {
      message: 'Welcome Supervisor',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('coordinator')
  coordinatorRoute() {
    return {
      message: 'Welcome Coordinator',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('stats')
  getUserStats() {
    return this.authService.getUserStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('supervisors')
  listSupervisors() {
    return this.authService.listSupervisors();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('users')
  listAllUsers() {
    return this.authService.listAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Patch('users/:userId/role')
  updateUserRole(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.authService.updateUserRole(
      userId,
      dto.role,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Patch('users/:userId/status')
  updateUserStatus(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.authService.updateUserStatus(
      userId,
      dto.isActive,
      req.user.userId,
    );
  }

  @UseGuards(InternalApiKeyGuard)
  @Get('internal/active-users')
  listActiveUserIds() {
    return this.authService.listActiveUserIds();
  }
}
