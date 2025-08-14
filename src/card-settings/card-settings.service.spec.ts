import { Test, TestingModule } from '@nestjs/testing';
import { CardSettingsService } from './card-settings.service';

describe('CardSettingsService', () => {
  let service: CardSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CardSettingsService],
    }).compile();

    service = module.get<CardSettingsService>(CardSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
