import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { User } from './interfaces/user.interface';

const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return req.cookies['access_token'];
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET не определен в .env файле!');
    }

    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: { sub: number; email: string }): Omit<User, 'password'> {
    return { userId: payload.sub, email: payload.email };
  }
}
