import { Module } from '@nestjs/common';
import { CardSettingsService } from './card-settings.service';
import { CardSettingsController } from './card-settings.controller';

@Module({
  providers: [CardSettingsService],
  controllers: [CardSettingsController],
})
export class CardSettingsModule {}
