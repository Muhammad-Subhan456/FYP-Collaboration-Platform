import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationResultsController } from './evaluation-results.controller';

describe('EvaluationResultsController', () => {
  let controller: EvaluationResultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationResultsController],
    }).compile();

    controller = module.get<EvaluationResultsController>(EvaluationResultsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
