import { Test, TestingModule } from '@nestjs/testing';
import { GlobalAnnouncementsController } from './global-announcements.controller';

describe('GlobalAnnouncementsController', () => {
  let controller: GlobalAnnouncementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalAnnouncementsController],
    }).compile();

    controller = module.get<GlobalAnnouncementsController>(GlobalAnnouncementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
