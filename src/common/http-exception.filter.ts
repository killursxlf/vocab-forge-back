import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    if (
      error instanceof Error &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      response
        .status(413)
        .json({ statusCode: 413, message: 'Request body exceeds 64 KB' });
      return;
    }
    if (error instanceof HttpException) {
      const body = error.getResponse();
      response
        .status(error.getStatus())
        .json(typeof body === 'string' ? { message: body } : body);
      return;
    }
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : undefined;
    const status =
      code === 'P2002' || code === 'P2003' || code === 'P2034'
        ? 409
        : code === 'P2025'
          ? 404
          : 500;
    if (status === 500)
      this.logger.error({
        message: 'Unhandled request error',
        requestId: response.getHeader('X-Request-Id'),
        method: request.method,
        path: request.path,
        code,
      });
    response.status(status).json({
      statusCode: status,
      message:
        status === 404
          ? 'Resource not found'
          : status === 409
            ? 'The request conflicts with the current data'
            : 'Internal server error',
    });
  }
}
