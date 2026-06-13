import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayHttpService {

  async get(
    url: string,
    authorization?: string,
    params?: any,
  ) {
    const response = await axios.get(
      url,
      {
        headers: {
          Authorization:
            authorization,
        },
        params,
      },
    );

    return response.data;
  }

  async post(
    url: string,
    body: any,
    authorization?: string,
  ) {
    const response = await axios.post(
      url,
      body,
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