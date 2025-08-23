import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WordSetsModule } from './word-sets/word-sets.module';
import { WordsModule } from './words/words.module';
import { PrismaModule } from './prisma/prisma.module';
import { CardSettingsService } from './card-settings/card-settings.service';
import { CardSettingsController } from './card-settings/card-settings.controller';
import { CardSettingsModule } from './card-settings/card-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // <-- подключаем ConfigModule
    AuthModule,
    UsersModule,
    WordSetsModule,
    WordsModule,
    PrismaModule,
    CardSettingsModule,
  ],
  controllers: [AppController, CardSettingsController],
  providers: [AppService, CardSettingsService],
})
export class AppModule {}
