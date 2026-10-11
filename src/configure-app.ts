import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { HttpExceptionFilter } from './common/http-exception.filter';

export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService);
  const origins = config.getOrThrow<string>('CORS_ORIGINS').split(',');
  const logger = new Logger('HTTP');
  app.disable('x-powered-by');
  const proxies = config.get<string>('TRUST_PROXY');
  if (proxies)
    app.set(
      'trust proxy',
      proxies.split(',').map((subnet) => subnet.trim()),
    );
  app.use(helmet());
  app.use(cookieParser());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const start = Date.now();
    response.setHeader('X-Request-Id', requestId);
    response.on('finish', () => {
      if (!request.path.startsWith('/health/'))
        logger.log({
          requestId,
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs: Date.now() - start,
        });
    });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.get('origin');
      if (
        (origin && !origins.includes(origin)) ||
        (!origin && !request.is('application/json'))
      ) {
        response
          .status(403)
          .json({ statusCode: 403, message: 'Untrusted request origin' });
        return;
      }
    }
    next();
  });
  app.useBodyParser('json', { limit: '64kb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: origins,
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'X-Next-Offset'],
  });
  app.enableShutdownHooks();
}
