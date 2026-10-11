import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import type { RequestWithUser } from './interfaces/request-with-user.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'disabled',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'disabled',
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    request: RequestWithUser,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email)
        throw new UnauthorizedException('Google did not provide an email');
      const raw = profile._json as {
        email_verified?: boolean;
        verified_email?: boolean;
      };
      const user = await this.auth.validateGoogleUser(
        {
          googleId: profile.id,
          email: email.trim().toLowerCase(),
          name: profile.displayName,
          verified: raw.email_verified === true || raw.verified_email === true,
        },
        request.googleLinkUserId,
        request.googleLinkTokenVersion,
      );
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
