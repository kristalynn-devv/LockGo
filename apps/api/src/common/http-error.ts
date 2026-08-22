import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorBody = {
  statusCode: number;
  code: string;
  message: string;
};

export class ApiError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    const body: ErrorBody = { statusCode: status, code, message };
    super(body, status);
  }
}
