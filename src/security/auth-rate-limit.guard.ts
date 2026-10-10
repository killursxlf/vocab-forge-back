import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthRateLimitGuard
  implements CanActivate, OnModuleInit, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;
  private readonly logger = new Logger(AuthRateLimitGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.prisma
        .$executeRaw`DELETE FROM "AuthRateLimit" WHERE "expiresAt" < CURRENT_TIMESTAMP`.catch(
        () =>
          this.logger.warn('Expired auth rate limits could not be cleaned up'),
      );
    }, 60000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const key = createHash('sha256')
      .update(request.ip ?? request.socket.remoteAddress ?? 'unknown')
      .digest('hex');
    const windowSeconds = this.config.getOrThrow<number>(
      'AUTH_RATE_WINDOW_SECONDS',
    );
    let rows: { count: number; expiresAt: Date }[];
    try {
      rows = await this.prisma.$queryRaw`
        INSERT INTO "AuthRateLimit" ("key", "count", "expiresAt")
        VALUES (${key}, 1, CURRENT_TIMESTAMP + ${windowSeconds} * INTERVAL '1 second')
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
          "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ${windowSeconds} * INTERVAL '1 second' ELSE "AuthRateLimit"."expiresAt" END
        RETURNING "count", "expiresAt"
      `;
    } catch {
      throw new ServiceUnavailableException(
        'Authentication is temporarily unavailable',
      );
    }
    if (rows[0].count > this.config.getOrThrow<number>('AUTH_RATE_LIMIT')) {
      response.setHeader(
        'Retry-After',
        Math.max(
          1,
          Math.ceil((rows[0].expiresAt.getTime() - Date.now()) / 1000),
        ),
      );
      throw new HttpException('Too many authentication attempts', 429);
    }
    return true;
  }
}
