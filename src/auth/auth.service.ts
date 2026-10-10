import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User as DatabaseUser } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { User } from './interfaces/user.interface';

function authenticatedUser(user: DatabaseUser): User {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    tokenVersion: user.tokenVersion,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.users.findOneByEmail(email);
    if (!user?.password || !(await bcrypt.compare(password, user.password)))
      return null;
    return authenticatedUser(user);
  }

  login(user: User) {
    return {
      access_token: this.jwt.sign({
        sub: user.userId,
        email: user.email,
        version: user.tokenVersion,
      }),
    };
  }

  async validateGoogleUser(
    profile: {
      googleId: string;
      email: string;
      name: string;
      verified: boolean;
    },
    linkUserId?: number,
    linkTokenVersion?: number,
  ) {
    if (!profile.verified)
      throw new UnauthorizedException('Google email must be verified');
    if (linkUserId !== undefined) {
      if (linkTokenVersion === undefined)
        throw new UnauthorizedException('Invalid linking request');
      return authenticatedUser(
        await this.users.linkGoogle(
          linkUserId,
          linkTokenVersion,
          profile.googleId,
        ),
      );
    }
    let user = await this.users.findOneByGoogleId(profile.googleId);
    if (!user) {
      if (await this.users.findOneByEmail(profile.email)) {
        throw new ConflictException(
          'Sign in to your existing account before linking Google',
        );
      }
      user = await this.users.createWithGoogle({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
      });
    }
    return authenticatedUser(user);
  }

  publicProfile(user: User) {
    return { userId: user.userId, email: user.email, name: user.name };
  }

  logout(user: User) {
    return this.users.revokeTokens(user.userId, user.tokenVersion);
  }
}
