import type { ErrorReporter } from '@/shared/application/ports/error-reporter.interface.js';

export class FakeErrorReporter implements ErrorReporter {
  reported: unknown[] = [];

  report(error: unknown): void {
    this.reported.push(error);
  }
}
