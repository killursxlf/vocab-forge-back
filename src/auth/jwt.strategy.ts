import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import type { User } from './interfaces/user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: (request: Request) => {
        const token: unknown = request?.cookies?.['access_token'];
        return typeof token === 'string' ? token : null;
      },
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: 'vocab-forge',
      audience: 'vocab-forge-api',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: { sub?: unknown; version?: unknown }): Promise<User> {
    if (!Number.isInteger(payload.sub) || !Number.isInteger(payload.version))
      throw new UnauthorizedException();
    const user = await this.users.findForAuthentication(payload.sub as number);
    if (!user || user.tokenVersion !== payload.version)
      throw new UnauthorizedException();
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      tokenVersion: user.tokenVersion,
    };
  }
}
