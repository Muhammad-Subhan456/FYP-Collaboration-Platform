import axios from 'axios';

import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @Headers('authorization')
    authorization: string,
  ) {
    const response =
      await axios.get(
        `${process.env.USER_SERVICE_URL}/profiles/me`,
        {
          headers: {
            Authorization:
              authorization,
          },
        },
      );

    return response.data;
  }
}