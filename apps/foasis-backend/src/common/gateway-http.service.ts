import axios, { Method } from 'axios';
import { HttpException, Injectable } from '@nestjs/common';

type ForwardOptions = {
  authorization?: string;
  data?: any;
  params?: any;
};

@Injectable()
export class GatewayHttpService {
  async forward(
    method: Method,
    url: string,
    options: ForwardOptions = {},
  ) {
    const response = await axios({
      method,
      url,
      headers: {
        ...(options.authorization
          ? { Authorization: options.authorization }
          : {}),
      },
      data: options.data,
      params: options.params,
      timeout: 10000,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      throw new HttpException(
        response.data,
        response.status,
      );
    }

    return response.data;
  }

  async get(
    url: string,
    authorization?: string,
    params?: any,
  ) {
    return this.forward('get', url, {
      authorization,
      params,
    });
  }

  async post(
    url: string,
    data: any,
    authorization?: string,
  ) {
    return this.forward('post', url, {
      authorization,
      data,
    });
  }

  async patch(
    url: string,
    data: any,
    authorization?: string,
  ) {
    return this.forward('patch', url, {
      authorization,
      data,
    });
  }
}
