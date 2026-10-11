import {
  BadRequestException,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './google-oauth.guard';
import type { RequestWithUser } from './interfaces/request-with-user.interface';

describe('Google popup callbacks', () => {
  const attempt = 'cdf508b4-229d-4a3c-83cb-f5e7708dab75';
  const config = new ConfigService({
    GOOGLE_CLIENT_ID: 'test-client',
    FRONTEND_URL: 'http://localhost:8080',
    NODE_ENV: 'test',
  });
  const jwt = new JwtService({
    secret: 'test-secret-that-is-at-least-32-characters',
    signOptions: { issuer: 'vocab-forge', algorithm: 'HS256' },
  });
  const guard = new GoogleOAuthGuard(config, jwt);
  const passport = Object.getPrototypeOf(GoogleOAuthGuard.prototype) as {
    canActivate: (context: ExecutionContext) => Promise<boolean>;
  };
  let request: RequestWithUser;
  let response: Record<
    'cookie' | 'clearCookie' | 'redirect' | 'setHeader' | 'type' | 'send',
    jest.Mock
  >;
  let context: ExecutionContext;

  beforeEach(() => {
    request = {
      path: '/auth/google',
      query: { popupAttempt: attempt },
      cookies: {},
      user: { userId: 1, email: 'user@example.com', tokenVersion: 0 },
    } as RequestWithUser;
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
      setHeader: jest.fn(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    jest.spyOn(passport, 'canActivate').mockResolvedValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  it('restores the popup ID from signed state, ignoring callback query overrides', async () => {
    const options = guard.getAuthenticateOptions(context);
    const payload = jwt.verify<{ popupAttempt: string }>(options.state!, {
      audience: 'google-oauth-state',
    });
    expect(payload.popupAttempt).toBe(attempt);
    request.path = '/auth/google/callback';
    request.query = {
      state: options.state,
      popupAttempt: '00000000-0000-4000-8000-000000000000',
    };
    request.cookies = { google_oauth_state: options.state };
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.googlePopupAttempt).toBe(attempt);
  });

  it.each(['invalid', 'https://evil.example', null, [attempt]])(
    'rejects invalid popup IDs before starting OAuth: %p',
    (value) => {
      request.query = { popupAttempt: value } as RequestWithUser['query'];
      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        BadRequestException,
      );
    },
  );

  it('rejects tampered signed state even if the cookie matches', async () => {
    const options = guard.getAuthenticateOptions(context);
    const parts = options.state!.split('.');
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString(),
    ) as Record<string, unknown>;
    payload.popupAttempt = '00000000-0000-4000-8000-000000000000';
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tampered = parts.join('.');
    request.path = '/auth/google/callback';
    request.query = { state: tampered };
    request.cookies = { google_oauth_state: tampered };
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(request.googlePopupAttempt).toBeUndefined();
  });

  it('rejects invalid popup IDs in otherwise valid signed state', async () => {
    const state = jwt.sign(
      { nonce: 'test', popupAttempt: 'invalid' },
      { audience: 'google-oauth-state' },
    );
    request.path = '/auth/google/callback';
    request.query = { state };
    request.cookies = { google_oauth_state: state };
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('keeps clients without popup IDs compatible', async () => {
    request.query = {};
    const options = guard.getAuthenticateOptions(context);
    request.path = '/auth/google/callback';
    request.query = { state: options.state };
    request.cookies = { google_oauth_state: options.state };
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.googlePopupAttempt).toBeUndefined();
  });

  it('sets the session cookie and redirects to the configured frontend callback', () => {
    const auth = {
      login: jest.fn().mockReturnValue({ access_token: 'test-token' }),
    };
    const controller = new AuthController(
      auth as unknown as AuthService,
      config,
    );
    request.googlePopupAttempt = attempt;
    controller.googleCallback(request, response as unknown as Response);
    expect(response.cookie).toHaveBeenCalledWith(
      'access_token',
      'test-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:8080/auth/google/popup?attempt=' +
        attempt +
        '&complete=1',
    );
    expect(response.send).not.toHaveBeenCalled();
  });

  it('retains the legacy callback for full-page sign-in', () => {
    const auth = {
      login: jest.fn().mockReturnValue({ access_token: 'test-token' }),
    };
    const controller = new AuthController(
      auth as unknown as AuthService,
      config,
    );
    controller.googleCallback(request, response as unknown as Response);
    expect(response.redirect).not.toHaveBeenCalled();
    expect(response.send).toHaveBeenCalledWith(
      expect.stringContaining('google-auth-success'),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.stringContaining('nonce-'),
    );
  });
});
