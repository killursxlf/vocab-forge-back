import { Test, TestingModule } from '@nestjs/testing';
import { WordSetsController } from './word-sets.controller';
import { WordSetsService } from './word-sets.service';

describe('WordSetsController', () => {
  let controller: WordSetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WordSetsController],
      providers: [WordSetsService],
    }).compile();

    controller = module.get<WordSetsController>(WordSetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
