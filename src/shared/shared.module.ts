import { Module } from '@nestjs/common';
import { ERROR_REPORTER } from './application/ports/error-reporter.interface.js';
import { PrismaService } from './frameworks-drivers/database/prisma.service.js';
import { SentryErrorReporterAdapter } from './interface-adapters/gateways/sentry-error-reporter.adapter.js';

@Module({
  providers: [
    PrismaService,
    {
      provide: ERROR_REPORTER,
      useClass: SentryErrorReporterAdapter,
    },
  ],
  exports: [PrismaService, ERROR_REPORTER],
})
export class SharedModule {}
