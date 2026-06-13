import { Module } from '@nestjs/common';

import { GatewayHttpService } from './gateway-http.service';

@Module({
  providers: [GatewayHttpService],
  exports: [GatewayHttpService],
})
export class CommonModule {}