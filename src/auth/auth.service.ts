import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import type { User } from './interfaces/user.interface';

interface JwtPayload {
  email: string;
  sub: number;
}

interface LoginResponse {
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findOneByEmail(email);

    if (user?.password && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, id, name, ...rest } = user;

      const result: Omit<User, 'password'> = {
        userId: id,
        name: name ?? undefined,
        ...rest,
      };

      return result;
    }

    return null;
  }

  login(user: Omit<User, 'password'>): LoginResponse {
    const payload: JwtPayload = { email: user.email, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateGoogleUser(googleProfile: {
    googleId: string;
    email: string;
    name: string;
  }) {
    let user = await this.usersService.findOneByGoogleId(
      googleProfile.googleId,
    );

    if (!user) {
      user = await this.usersService.findOneByEmail(googleProfile.email);

      if (user) {
        user = await this.usersService.updateGoogleId(
          user.id,
          googleProfile.googleId,
        );
      } else {
        user = await this.usersService.createWithGoogle({
          email: googleProfile.email,
          name: googleProfile.name,
          googleId: googleProfile.googleId,
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, id, ...rest } = user;
    const userWithoutPassword = {
      userId: id,
      ...rest,
    };

    return userWithoutPassword;
  }
}
