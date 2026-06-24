import { Test, TestingModule } from '@nestjs/testing';
import { GlobalAnnouncementsService } from './global-announcements.service';

describe('GlobalAnnouncementsService', () => {
  let service: GlobalAnnouncementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalAnnouncementsService],
    }).compile();

    service = module.get<GlobalAnnouncementsService>(GlobalAnnouncementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
