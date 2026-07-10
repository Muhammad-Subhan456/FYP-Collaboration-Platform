import { Module } from '@nestjs/common';

import { GpaCalculationService } from '../gpa/gpa-calculation.service';

import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';

@Module({
  controllers: [PhasesController],
  providers: [PhasesService, GpaCalculationService],
  exports: [PhasesService],
})
export class PhasesModule {}
