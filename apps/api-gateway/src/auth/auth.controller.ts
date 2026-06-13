import axios from 'axios';

import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('register')
  async register(
    @Body() body: any,
  ) {
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/auth/register`,
      body,
    );

    return response.data;
  }

  @Post('login')
  async login(
    @Body() body: any,
  ) {
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/auth/login`,
      body,
    );

    return response.data;
  }
}