import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorBody } from './http-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'object' && raw && 'code' in raw) {
        response.status(status).json(raw);
        return;
      }

      const message =
        typeof raw === 'string'
          ? raw
          : Array.isArray((raw as { message?: unknown }).message)
            ? ((raw as { message: string[] }).message[0] ?? 'Bad request')
            : ((raw as { message?: string }).message ?? exception.message);

      const body: ErrorBody = {
        statusCode: status,
        code: status === 400 ? 'BAD_REQUEST' : exception.name.replace(/Exception$/, '').toUpperCase(),
        message,
      };
      response.status(status).json(body);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    } satisfies ErrorBody);
  }
}
