import axios from 'axios';

import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  @Post('register')
  async register(@Body() body: any) {
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/auth/register`,
      body,
    );

    return response.data;
  }

  @Post('login')
  async login(@Body() body: any) {
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/auth/login`,
      body,
    );

    return response.data;
  }

  @UseGuards(JwtAuthGuard)
  @Get('supervisors')
  async listSupervisors(
    @Headers('authorization') authorization: string,
  ) {
    const response = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/auth/supervisors`,
      {
        headers: { Authorization: authorization },
      },
    );

    return response.data;
  }
}
