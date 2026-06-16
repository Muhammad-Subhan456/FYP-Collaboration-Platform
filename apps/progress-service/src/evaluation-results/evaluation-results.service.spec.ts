import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationResultsService } from './evaluation-results.service';

describe('EvaluationResultsService', () => {
  let service: EvaluationResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvaluationResultsService],
    }).compile();

    service = module.get<EvaluationResultsService>(EvaluationResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
