import { Module } from '@nestjs/common';
import { WordsModule } from '../words/words.module';
import { WordSetsController } from './word-sets.controller';
import { WordSetsService } from './word-sets.service';

@Module({
  imports: [WordsModule],
  controllers: [WordSetsController],
  providers: [WordSetsService],
})
export class WordSetsModule {}
