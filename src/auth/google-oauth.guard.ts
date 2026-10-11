import {
  BadRequestException,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { isUUID } from 'class-validator';
import type { Response } from 'express';
import type { RequestWithUser } from './interfaces/request-with-user.interface';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('GOOGLE_CLIENT_ID'))
      throw new ServiceUnavailableException('Google sign-in is disabled');
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    if (request.path.endsWith('/callback')) {
      const state = request.query.state;
      const cookie: unknown = request.cookies?.['google_oauth_state'];
      response.clearCookie('google_oauth_state', this.cookieOptions());
      if (
        typeof state !== 'string' ||
        typeof cookie !== 'string' ||
        state.length > 2048 ||
        Buffer.byteLength(state) !== Buffer.byteLength(cookie) ||
        !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))
      )
        throw new UnauthorizedException('Invalid OAuth state');
      let payload: {
        nonce?: unknown;
        popupAttempt?: unknown;
        linkUserId?: number;
        linkTokenVersion?: number;
      };
      try {
        payload = this.jwt.verify(state, {
          audience: 'google-oauth-state',
          issuer: 'vocab-forge',
          algorithms: ['HS256'],
        });
      } catch {
        throw new UnauthorizedException('Expired or invalid OAuth state');
      }
      if (typeof payload.nonce !== 'string')
        throw new UnauthorizedException('Invalid OAuth state');
      if (payload.popupAttempt !== undefined) {
        if (
          typeof payload.popupAttempt !== 'string' ||
          !isUUID(payload.popupAttempt, '4')
        )
          throw new UnauthorizedException('Invalid popup attempt');
        request.googlePopupAttempt = payload.popupAttempt;
      }
      request.googleLinkUserId = payload.linkUserId;
      request.googleLinkTokenVersion = payload.linkTokenVersion;
    }
    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.path.endsWith('/callback')) return {};
    const response = context.switchToHttp().getResponse<Response>();
    const popupAttempt = request.query.popupAttempt;
    if (
      popupAttempt !== undefined &&
      (typeof popupAttempt !== 'string' || !isUUID(popupAttempt, '4'))
    )
      throw new BadRequestException('Invalid popup attempt');
    const linking = request.path.endsWith('/link');
    const state = this.jwt.sign(
      {
        nonce: randomBytes(32).toString('hex'),
        ...(popupAttempt ? { popupAttempt } : {}),
        ...(linking
          ? {
              linkUserId: request.user.userId,
              linkTokenVersion: request.user.tokenVersion,
            }
          : {}),
      },
      { audience: 'google-oauth-state', expiresIn: '10m' },
    );
    response.cookie('google_oauth_state', state, {
      ...this.cookieOptions(),
      maxAge: 600000,
    });
    return { state, prompt: 'select_account' };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/auth/google',
    };
  }
}
