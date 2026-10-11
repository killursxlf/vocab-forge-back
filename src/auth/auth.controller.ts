import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import type { RequestWithUser } from './interfaces/request-with-user.interface';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleOAuthGuard } from './google-oauth.guard';
import { AuthRateLimitGuard } from '../security/auth-rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    response.cookie('access_token', this.auth.login(user).access_token, {
      ...this.cookieOptions(),
      maxAge: 86400000,
    });
    return this.auth.publicProfile(user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: RequestWithUser) {
    return this.auth.publicProfile(request.user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.user);
    response.clearCookie('access_token', this.cookieOptions());
    return { message: 'Signed out on all devices' };
  }

  @Get('google')
  @UseGuards(AuthRateLimitGuard, GoogleOAuthGuard)
  googleLogin() {}

  @Get('google/link')
  @UseGuards(JwtAuthGuard, AuthRateLimitGuard, GoogleOAuthGuard)
  googleLink() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  googleCallback(@Req() request: RequestWithUser, @Res() response: Response) {
    response.cookie(
      'access_token',
      this.auth.login(request.user).access_token,
      { ...this.cookieOptions(), maxAge: 86400000 },
    );
    const origin = JSON.stringify(
      this.config.getOrThrow<string>('FRONTEND_URL'),
    ).replace(/</g, '\\u003c');
    const nonce = randomBytes(16).toString('base64');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'nonce-" +
        nonce +
        "'; base-uri 'none'; frame-ancestors 'none'",
    );
    response
      .type('html')
      .send(
        '<script nonce="' +
          nonce +
          '">const origin=' +
          origin +
          ';if(window.opener&&!window.opener.closed){window.opener.postMessage("google-auth-success",origin);window.close()}else{window.location.replace(origin+"/app")}</script>',
      );
  }

  private cookieOptions() {
    const production = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: production,
      sameSite: production ? ('none' as const) : ('lax' as const),
      path: '/',
    };
  }
}
