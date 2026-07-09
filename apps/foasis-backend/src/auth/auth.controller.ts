import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SelectContextDto,
  SwitchContextDto,
} from './dto/password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { SkipWorkspace } from '../common/decorators/skip-workspace.decorator';
import { DEFAULT_WORKSPACE_ID } from '../workspace/workspace.constants';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @SkipWorkspace()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ) {
    return this.authService.register(registerDto);
  }

  @SkipWorkspace()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
  ) {
    return this.authService.login(
      loginDto.email,
      loginDto.password,
    );
  }

  @SkipWorkspace()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @SkipWorkspace()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.token,
      dto.password,
    );
  }

  @SkipWorkspace()
  @Post('select-context')
  selectContext(@Body() dto: SelectContextDto) {
    return this.authService.selectContext(
      dto.selectionToken,
      dto.workspaceId,
      dto.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @SkipWorkspace()
  @Get('contexts')
  listContexts(@Req() req: { user: { userId: string } }) {
    return this.authService.listContexts(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @SkipWorkspace()
  @Post('switch-context')
  switchContext(
    @Req() req: { user: { userId: string } },
    @Body() dto: SwitchContextDto,
  ) {
    return this.authService.switchContext(
      req.user.userId,
      dto.workspaceId,
      dto.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @SkipWorkspace()
  changePassword(
    @Req() req: { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
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
  getUserStats(@Req() req: { workspaceId: string }) {
    return this.authService.getUserStats(req.workspaceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('supervisors')
  listSupervisors(@Req() req: { workspaceId: string }) {
    return this.authService.listSupervisors(req.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Get('users')
  listAllUsers(@Req() req: { workspaceId: string }) {
    return this.authService.listAllUsers(req.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Patch('users/:userId/role')
  updateUserRole(
    @Req() req: { user: { userId: string }; workspaceId: string },
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.authService.updateUserRole(
      userId,
      dto.role as 'STUDENT' | 'SUPERVISOR' | 'COORDINATOR' | 'EVALUATOR',
      req.user.userId,
      req.workspaceId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COORDINATOR')
  @Patch('users/:userId/status')
  updateUserStatus(
    @Req() req: { user: { userId: string }; workspaceId: string },
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.authService.updateUserStatus(
      userId,
      dto.isActive,
      req.user.userId,
      req.workspaceId,
    );
  }

  @SkipWorkspace()
  @UseGuards(InternalApiKeyGuard)
  @Get('internal/active-users')
  listActiveUserIds(
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.authService.listActiveUserIds(
      workspaceId ?? DEFAULT_WORKSPACE_ID,
    );
  }
}
