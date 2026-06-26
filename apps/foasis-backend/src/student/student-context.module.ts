import { Module } from '@nestjs/common';

import { StudentContextService } from './student-context.service';

@Module({
  providers: [StudentContextService],
  exports: [StudentContextService],
})
export class StudentContextModule {}
