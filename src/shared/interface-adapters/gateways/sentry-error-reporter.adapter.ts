import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { ErrorReporter } from '@/shared/application/ports/error-reporter.interface.js';

@Injectable()
export class SentryErrorReporterAdapter implements ErrorReporter {
  report(error: unknown): void {
    Sentry.captureException(error);
  }
}
