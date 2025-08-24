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
import type { Response } from 'express';
import { LoginDto } from '../auth/dto/login.dto';
import { AuthService } from './auth.service';
import type { RequestWithUser } from './interfaces/request-with-user.interface';
import type { User } from './interfaces/user.interface';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleOAuthGuard } from './google-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<User, 'password'>> {
    const userWithoutPassword = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!userWithoutPassword) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    const access_token =
      this.authService.login(userWithoutPassword).access_token;

    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    return userWithoutPassword;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: RequestWithUser): User {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    return { message: 'Вы успешно вышли из системы' };
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  googleCallback(@Req() req: RequestWithUser, @Res() response: Response) {
    try {
      const user = req.user as Omit<User, 'password'>;

      const { access_token } = this.authService.login(user);

      response.cookie('access_token', access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });

      const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

      return response.send(`
        <script>
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage('google-auth-success', '${FRONTEND_URL}');
              window.close();
            } else {
              // Если opener недоступен, редиректим напрямую
              window.location.href = '${FRONTEND_URL}/app';
            }
          } catch (error) {
            console.error('Error sending message:', error);
            window.location.href = '${FRONTEND_URL}/app';
          }
        </script>
      `);
    } catch (err) {
      console.error(err);
      const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
      return response.send(`
        <script>
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage('google-auth-error', '${FRONTEND_URL}');
          }
          window.close();
        </script>
      `);
    }
  }
}
