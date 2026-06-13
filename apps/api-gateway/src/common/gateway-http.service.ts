import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayHttpService {
  async get(url: string, authorization?: string, params?: any) {
    console.log(`[Gateway] GET ${url}`);
    const response = await axios.get(url, {
      headers: {
        Authorization: authorization,
      },
      params,
      timeout: 5000,
    });

    return response.data;
  }

  async post(url: string, body: any, authorization?: string) {
    console.log(`[Gateway] GET ${url}`);
    const response = await axios.post(url, body, {
      headers: {
        Authorization: authorization,
      },
      timeout: 5000,
    });

    return response.data;
  }
}
