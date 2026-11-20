import * as Sentry from '@sentry/nestjs';
import type { ErrorEvent } from '@sentry/nestjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  DomainError,
  ERROR_KIND,
} from '@/shared/domain/errors/domain-error.js';
import { SentryErrorReporterAdapter } from '@/shared/interface-adapters/gateways/sentry-error-reporter.adapter.js';

const FLUSH_TIMEOUT_MS = 2000;

class SlugConflictError extends DomainError {
  readonly code = 'SLUG_CONFLICT';
  readonly kind = ERROR_KIND.CONFLICT;

  constructor() {
    super('O slug já existe.');
  }
}

let sut: SentryErrorReporterAdapter;
let sentEvents: ErrorEvent[];

function sentExceptions(): { type?: string; value?: string }[] {
  return sentEvents.flatMap((event) =>
    (event.exception?.values ?? []).map(({ type, value }) => ({ type, value })),
  );
}

beforeAll(() => {
  Sentry.init({
    dsn: 'https://public@sentry.invalid/1',
    defaultIntegrations: false,
    sendClientReports: false,
    // Devolver null descarta o evento depois de guardá-lo, então nada sai pela rede.
    beforeSend: (event) => {
      sentEvents.push(event);

      return null;
    },
  });
});

beforeEach(() => {
  sentEvents = [];
  sut = new SentryErrorReporterAdapter();
});

afterAll(async () => {
  await Sentry.close(FLUSH_TIMEOUT_MS);
});

describe('SentryErrorReporterAdapter', () => {
  it('should send an event with the type and the message of the error', async () => {
    const connectionLost = new Error('connection lost');

    sut.report(connectionLost);
    await Sentry.flush(FLUSH_TIMEOUT_MS);

    expect(sentExceptions()).toEqual([
      { type: 'Error', value: 'connection lost' },
    ]);
  });

  it('should send the class name of a domain error as the event type', async () => {
    const slugConflict = new SlugConflictError();

    sut.report(slugConflict);
    await Sentry.flush(FLUSH_TIMEOUT_MS);

    expect(sentExceptions()).toEqual([
      {
        type: 'SlugConflictError',
        value: slugConflict.message,
      },
    ]);
  });

  it('should send a value that is not an Error with its text as the message', async () => {
    sut.report('connection lost');
    await Sentry.flush(FLUSH_TIMEOUT_MS);

    expect(sentExceptions()).toEqual([
      { type: 'Error', value: 'connection lost' },
    ]);
  });

  it('should send one event for each reported error', async () => {
    sut.report(new Error('first failure'));
    sut.report(new Error('second failure'));
    await Sentry.flush(FLUSH_TIMEOUT_MS);

    expect(sentExceptions()).toEqual([
      { type: 'Error', value: 'first failure' },
      { type: 'Error', value: 'second failure' },
    ]);
  });
});
