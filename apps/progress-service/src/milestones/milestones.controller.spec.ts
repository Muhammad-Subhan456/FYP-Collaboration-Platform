import { Test, TestingModule } from '@nestjs/testing';
import { MilestonesController } from './milestones.controller';

describe('MilestonesController', () => {
  let controller: MilestonesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MilestonesController],
    }).compile();

    controller = module.get<MilestonesController>(MilestonesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
