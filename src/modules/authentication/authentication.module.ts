import {
  Module,
  RequestMethod,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module.js';
import { BetterAuthFactory } from './frameworks-drivers/better-auth/better-auth.factory.js';
import {
  BETTER_AUTH,
  type BetterAuth,
} from './frameworks-drivers/better-auth/better-auth.types.js';
import { BetterAuthMiddleware } from './frameworks-drivers/better-auth/better-auth.middleware.js';
import { EMAIL_SENDER } from './application/ports/email-sender.interface.js';
import { SesEmailSenderAdapter } from './interface-adapters/gateways/ses-email-sender.adapter.js';

const BETTER_AUTH_ROUTES = {
  path: 'api/auth/*path',
  method: RequestMethod.ALL,
};

@Module({
  imports: [SharedModule],
  providers: [
    {
      provide: EMAIL_SENDER,
      useClass: SesEmailSenderAdapter,
    },
    BetterAuthFactory,
    {
      provide: BETTER_AUTH,
      inject: [BetterAuthFactory],
      useFactory: (betterAuthFactory: BetterAuthFactory): BetterAuth =>
        betterAuthFactory.create(),
    },
  ],
})
export class AuthenticationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(BetterAuthMiddleware).forRoutes(BETTER_AUTH_ROUTES);
  }
}
