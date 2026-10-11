import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { GoogleOAuthGuard } from './google-oauth.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1d',
          issuer: 'vocab-forge',
          audience: 'vocab-forge-api',
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  providers: [AuthService, GoogleStrategy, JwtStrategy, GoogleOAuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}
