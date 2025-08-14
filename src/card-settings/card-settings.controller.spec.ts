import { Test, TestingModule } from '@nestjs/testing';
import { CardSettingsController } from './card-settings.controller';

describe('CardSettingsController', () => {
  let controller: CardSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardSettingsController],
    }).compile();

    controller = module.get<CardSettingsController>(CardSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
