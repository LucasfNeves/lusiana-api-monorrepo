import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { SharedModule } from '@/shared/shared.module.js';
import { CONFIG_MODULE_OPTIONS } from './config/config-module-options.js';
import { ErrorCodeExceptionFilter } from './http/error-code-exception.filter.js';
import {
  ERROR_FIELDS,
  FIELDS_BY_ERROR_CODE,
} from './http/error-fields.const.js';
import { toValidationFailedException } from './http/validation-failed.exception.js';

@Module({
  imports: [ConfigModule.forRoot(CONFIG_MODULE_OPTIONS), SharedModule],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: toValidationFailedException,
      }),
    },
    {
      provide: ERROR_FIELDS,
      useValue: FIELDS_BY_ERROR_CODE,
    },
    {
      provide: APP_FILTER,
      useClass: ErrorCodeExceptionFilter,
    },
  ],
})
export class AppModule {}
