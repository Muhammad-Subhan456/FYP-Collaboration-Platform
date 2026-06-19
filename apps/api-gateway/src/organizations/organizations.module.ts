import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { OrganizationsGatewayController } from './organizations.controller';

@Module({
  imports: [CommonModule],
  controllers: [OrganizationsGatewayController],
})
export class OrganizationsGatewayModule {}
