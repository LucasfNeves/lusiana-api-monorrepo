import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpErrorMessages } from './http-error-messages.const.js';
import {
  DomainError,
  ERROR_KIND,
  type ErrorKind,
} from '@/shared/domain/errors/domain-error.js';
import {
  ERROR_REPORTER,
  type ErrorReporter,
} from '@/shared/application/ports/error-reporter.interface.js';
import {
  type ErrorDetail,
  ValidationFailedException,
} from './validation-failed.exception.js';
import { ERROR_FIELDS, type ErrorFields } from './error-fields.const.js';

const KIND_TO_HTTP_STATUS: Record<ErrorKind, number> = {
  [ERROR_KIND.INVALID_INPUT]: HttpStatus.BAD_REQUEST,
  [ERROR_KIND.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ERROR_KIND.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ERROR_KIND.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ERROR_KIND.CONFLICT]: HttpStatus.CONFLICT,
  [ERROR_KIND.UNEXPECTED]: HttpStatus.INTERNAL_SERVER_ERROR,
};

const VALIDATION_FAILED_CODE = 'VALIDATION_FAILED';
const UNEXPECTED_ERROR_CODE = 'UNEXPECTED_ERROR';
const FIRST_SERVER_ERROR_STATUS = 500;

type ErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  details: ErrorDetail[];
};

@Catch()
export class ErrorCodeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorCodeExceptionFilter.name);

  constructor(
    @Inject(ERROR_REPORTER)
    private readonly errorReporter: ErrorReporter,
    @Inject(ERROR_FIELDS)
    private readonly fieldsByErrorCode: ErrorFields,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const body = this.toBody(exception, request);

    if (body.statusCode >= FIRST_SERVER_ERROR_STATUS) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
      this.errorReporter.report(exception);
    }

    response.status(body.statusCode).json({
      ...body,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private toBody(exception: unknown, request: Request): ErrorBody {
    if (exception instanceof DomainError) {
      return {
        statusCode: KIND_TO_HTTP_STATUS[exception.kind],
        code: exception.code,
        message: exception.message,
        details: this.detailsOf(exception, request),
      };
    }

    if (exception instanceof ValidationFailedException) {
      return {
        statusCode: exception.getStatus(),
        code: VALIDATION_FAILED_CODE,
        message: HttpErrorMessages.VALIDATION_FAILED,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: UNEXPECTED_ERROR_CODE,
      message: HttpErrorMessages.UNEXPECTED_ERROR,
      details: [],
    };
  }

  private detailsOf(exception: DomainError, request: Request): ErrorDetail[] {
    const candidateFields = this.fieldsByErrorCode[exception.code] ?? [];
    const field = candidateFields.find((candidate) =>
      this.wasSent(candidate, request),
    );

    if (!field) {
      return [];
    }

    return [{ field, message: exception.message }];
  }

  private wasSent(field: string, request: Request): boolean {
    const rootField = field.split('.')[0] ?? field;
    const sources: unknown[] = [request.body, request.query];

    return sources.some(
      (source) =>
        typeof source === 'object' &&
        source !== null &&
        Object.hasOwn(source, rootField),
    );
  }

  private fromHttpException(exception: HttpException): ErrorBody {
    const statusCode = exception.getStatus();
    const payload = exception.getResponse();
    const message: unknown =
      typeof payload === 'object' && 'message' in payload
        ? payload.message
        : payload;

    return {
      statusCode,
      code: HttpStatus[statusCode] ?? UNEXPECTED_ERROR_CODE,
      message: typeof message === 'string' ? message : exception.message,
      details: [],
    };
  }
}
