import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { ErrorCodeExceptionFilter } from '@/main/http/error-code-exception.filter.js';
import type { ErrorFields } from '@/main/http/error-fields.const.js';
import { ValidationFailedException } from '@/main/http/validation-failed.exception.js';
import { HttpErrorMessages } from '@/main/http/http-error-messages.const.js';
import {
  DomainError,
  ERROR_KIND,
  type ErrorKind,
} from '@/shared/domain/errors/domain-error.js';
import { FakeErrorReporter } from '@/shared/tests/fakes/fake-error-reporter.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const PATH = '/test';
const SLUG_CONFLICT_MESSAGE = 'O slug já existe.';
const PARENT_NOT_FOUND_MESSAGE = 'O pai não existe.';
const FIELDS_BY_ERROR_CODE: ErrorFields = {
  SLUG_CONFLICT: ['slug', 'name'],
  PARENT_NOT_FOUND: ['parentId'],
};

class SlugConflictError extends DomainError {
  readonly code = 'SLUG_CONFLICT';
  readonly kind = ERROR_KIND.CONFLICT;

  constructor() {
    super(SLUG_CONFLICT_MESSAGE);
  }
}

class ParentNotFoundError extends DomainError {
  readonly code = 'PARENT_NOT_FOUND';
  readonly kind = ERROR_KIND.NOT_FOUND;

  constructor() {
    super(PARENT_NOT_FOUND_MESSAGE);
  }
}

class KindDomainError extends DomainError {
  readonly code = 'KIND_DOMAIN_ERROR';

  constructor(readonly kind: ErrorKind) {
    super('Erro de domínio do teste.');
  }
}

class FakeResponse {
  statusCode: number | null = null;
  body: unknown = null;

  status(statusCode: number): this {
    this.statusCode = statusCode;

    return this;
  }

  json(body: unknown): this {
    this.body = body;

    return this;
  }
}

let sut: ErrorCodeExceptionFilter;
let errorReporter: FakeErrorReporter;
let response: FakeResponse;
let host: ExecutionContextHost;
let loggerError: MockInstance<Logger['error']>;

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(NOW);
  loggerError = vi
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  errorReporter = new FakeErrorReporter();
  response = new FakeResponse();
  host = new ExecutionContextHost([
    { url: PATH, body: { name: 'Anel Solitário Ouro' }, query: {} },
    response,
  ]);
  sut = new ErrorCodeExceptionFilter(errorReporter, FIELDS_BY_ERROR_CODE);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ErrorCodeExceptionFilter', () => {
  it('should answer a domain error with its own code, its message and the field it refers to', () => {
    const slugConflict = new SlugConflictError();

    sut.catch(slugConflict, host);

    expect(response.statusCode).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({
      statusCode: HttpStatus.CONFLICT,
      code: 'SLUG_CONFLICT',
      message: SLUG_CONFLICT_MESSAGE,
      details: [{ field: 'name', message: SLUG_CONFLICT_MESSAGE }],
      timestamp: NOW.toISOString(),
      path: PATH,
    });
  });

  it('should leave the field out of the details when the request did not send it', () => {
    const parentNotFound = new ParentNotFoundError();

    sut.catch(parentNotFound, host);

    expect(response.body).toMatchObject({
      code: 'PARENT_NOT_FOUND',
      details: [],
    });
  });

  it.each([
    {
      sent: 'name and slug',
      body: { name: 'Anel', slug: 'anel' },
      field: 'slug',
    },
    { sent: 'only name', body: { name: 'Anel' }, field: 'name' },
  ])(
    'should point the slug conflict to $field when the body sent $sent',
    ({ body, field }) => {
      const slugRequestHost = new ExecutionContextHost([
        { url: PATH, body, query: {} },
        response,
      ]);

      sut.catch(new SlugConflictError(), slugRequestHost);

      expect(response.body).toMatchObject({
        details: [{ field, message: SLUG_CONFLICT_MESSAGE }],
      });
    },
  );

  it('should point to a field sent in the query string', () => {
    const slugConflict = new SlugConflictError();
    const queryRequestHost = new ExecutionContextHost([
      { url: PATH, body: {}, query: { name: 'Anel' } },
      response,
    ]);

    sut.catch(slugConflict, queryRequestHost);

    expect(response.body).toMatchObject({
      code: 'SLUG_CONFLICT',
      details: [{ field: 'name', message: SLUG_CONFLICT_MESSAGE }],
    });
  });

  it('should answer no details for a code the field map does not know', () => {
    const unmappedError = new KindDomainError(ERROR_KIND.CONFLICT);

    sut.catch(unmappedError, host);

    expect(response.body).toMatchObject({
      code: 'KIND_DOMAIN_ERROR',
      details: [],
    });
  });

  it.each([
    { kind: ERROR_KIND.INVALID_INPUT, expected: HttpStatus.BAD_REQUEST },
    { kind: ERROR_KIND.UNAUTHORIZED, expected: HttpStatus.UNAUTHORIZED },
    { kind: ERROR_KIND.FORBIDDEN, expected: HttpStatus.FORBIDDEN },
    { kind: ERROR_KIND.NOT_FOUND, expected: HttpStatus.NOT_FOUND },
    { kind: ERROR_KIND.CONFLICT, expected: HttpStatus.CONFLICT },
    { kind: ERROR_KIND.UNEXPECTED, expected: HttpStatus.INTERNAL_SERVER_ERROR },
  ])(
    'should map the domain error kind $kind to the status $expected',
    ({ kind, expected }) => {
      const domainError = new KindDomainError(kind);

      sut.catch(domainError, host);

      expect(response.statusCode).toBe(expected);
      expect(response.body).toEqual({
        statusCode: expected,
        code: 'KIND_DOMAIN_ERROR',
        message: 'Erro de domínio do teste.',
        details: [],
        timestamp: NOW.toISOString(),
        path: PATH,
      });
    },
  );

  it('should answer VALIDATION_FAILED with the field and the message of each validation error', () => {
    const validationFailed = new ValidationFailedException([
      { field: 'name', message: 'nome é obrigatório' },
      {
        field: 'variants.0.initialStock',
        message: 'estoque inicial deve ser maior ou igual a 0',
      },
    ]);

    sut.catch(validationFailed, host);

    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_FAILED',
      message: HttpErrorMessages.VALIDATION_FAILED,
      details: [
        { field: 'name', message: 'nome é obrigatório' },
        {
          field: 'variants.0.initialStock',
          message: 'estoque inicial deve ser maior ou igual a 0',
        },
      ],
      timestamp: NOW.toISOString(),
      path: PATH,
    });
  });

  it('should answer an http exception with its status name as code', () => {
    const invalidId = new BadRequestException(
      'Validation failed (uuid is expected)',
    );

    sut.catch(invalidId, host);

    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'BAD_REQUEST',
      message: 'Validation failed (uuid is expected)',
      details: [],
      timestamp: NOW.toISOString(),
      path: PATH,
    });
  });

  it('should answer an http exception built from a plain string', () => {
    const forbidden = new HttpException(
      'Forbidden resource',
      HttpStatus.FORBIDDEN,
    );

    sut.catch(forbidden, host);

    expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(response.body).toEqual({
      statusCode: HttpStatus.FORBIDDEN,
      code: 'FORBIDDEN',
      message: 'Forbidden resource',
      details: [],
      timestamp: NOW.toISOString(),
      path: PATH,
    });
  });

  it('should fall back to the exception message when the http payload carries no message', () => {
    const payloadWithoutMessage = new HttpException(
      { reason: 'teapot' },
      HttpStatus.I_AM_A_TEAPOT,
    );

    sut.catch(payloadWithoutMessage, host);

    expect(response.statusCode).toBe(HttpStatus.I_AM_A_TEAPOT);
    expect(response.body).toEqual({
      statusCode: HttpStatus.I_AM_A_TEAPOT,
      code: 'I_AM_A_TEAPOT',
      message: 'Http Exception',
      details: [],
      timestamp: NOW.toISOString(),
      path: PATH,
    });
  });

  it('should answer UNEXPECTED_ERROR as code when the http status has no name', () => {
    const unnamedStatus = new HttpException('Client closed request', 499);

    sut.catch(unnamedStatus, host);

    expect(response.statusCode).toBe(499);
    expect(response.body).toEqual({
      statusCode: 499,
      code: 'UNEXPECTED_ERROR',
      message: 'Client closed request',
      details: [],
      timestamp: NOW.toISOString(),
      path: PATH,
    });
  });

  it('should answer an unknown error as UNEXPECTED_ERROR without leaking its message', () => {
    const connectionLost = new Error('connection lost');

    sut.catch(connectionLost, host);

    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.body).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'UNEXPECTED_ERROR',
      message: HttpErrorMessages.UNEXPECTED_ERROR,
      details: [],
      timestamp: NOW.toISOString(),
      path: PATH,
    });
  });

  it.each([
    { case: 'an unknown error', exception: new Error('connection lost') },
    {
      case: 'a domain error of kind UNEXPECTED',
      exception: new KindDomainError(ERROR_KIND.UNEXPECTED),
    },
    {
      case: 'a 5xx http exception',
      exception: new ServiceUnavailableException(),
    },
  ])('should log the stack of $case and report it', ({ exception }) => {
    sut.catch(exception, host);

    expect(loggerError).toHaveBeenCalledExactlyOnceWith(exception.stack);
    expect(errorReporter.reported).toHaveLength(1);
    expect(errorReporter.reported[0]).toBe(exception);
  });

  it('should log and report a thrown value that is not an Error', () => {
    sut.catch('boom', host);

    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(loggerError).toHaveBeenCalledExactlyOnceWith('boom');
    expect(errorReporter.reported).toEqual(['boom']);
  });

  it('should keep the status of a 5xx http exception', () => {
    const serviceUnavailable = new ServiceUnavailableException();

    sut.catch(serviceUnavailable, host);

    expect(response.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.body).toEqual({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service Unavailable',
      details: [],
      timestamp: NOW.toISOString(),
      path: PATH,
    });
  });

  it.each([
    {
      case: 'a domain error below 500',
      exception: new ParentNotFoundError(),
    },
    {
      case: 'a 4xx http exception',
      exception: new BadRequestException(['nome é obrigatório']),
    },
  ])('should neither log nor report $case', ({ exception }) => {
    sut.catch(exception, host);

    expect(loggerError).not.toHaveBeenCalled();
    expect(errorReporter.reported).toEqual([]);
  });
});
