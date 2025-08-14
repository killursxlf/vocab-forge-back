import { Test, TestingModule } from '@nestjs/testing';
import { WordSetsService } from './word-sets.service';

describe('WordSetsService', () => {
  let service: WordSetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WordSetsService],
    }).compile();

    service = module.get<WordSetsService>(WordSetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
