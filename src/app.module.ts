import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WordSetsModule } from './word-sets/word-sets.module';
import { WordsModule } from './words/words.module';
import { PrismaModule } from './prisma/prisma.module';
import { CardSettingsModule } from './card-settings/card-settings.module';
import { SecurityModule } from './security/security.module';
import { HealthController } from './health/health.controller';
import { validateEnvironment } from './config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    WordSetsModule,
    WordsModule,
    CardSettingsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
