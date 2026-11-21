import {
  Module,
  RequestMethod,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/shared/frameworks-drivers/database/prisma.service.js';
import { SharedModule } from '@/shared/shared.module.js';
import {
  BETTER_AUTH,
  createAuth,
  type BetterAuth,
} from './frameworks-drivers/better-auth/better-auth.config.js';
import { BetterAuthMiddleware } from './frameworks-drivers/better-auth/better-auth.middleware.js';

const BETTER_AUTH_ROUTES = {
  path: 'api/auth/*path',
  method: RequestMethod.ALL,
};

@Module({
  imports: [SharedModule],
  providers: [
    {
      provide: BETTER_AUTH,
      inject: [PrismaService, ConfigService],
      useFactory: (
        prisma: PrismaService,
        configService: ConfigService,
      ): BetterAuth =>
        createAuth(
          prisma,
          {
            secret: configService.getOrThrow<string>('auth.secret'),
            baseUrl: configService.getOrThrow<string>('auth.url'),
            trustedOrigins:
              configService.getOrThrow<string[]>('http.corsOrigins'),
            passwordPepper: configService.getOrThrow<string>(
              'auth.passwordPepper',
            ),
          },
          {
            enabled: configService.getOrThrow<boolean>('auth.google.enabled'),
            clientId: configService.getOrThrow<string>('auth.google.clientId'),
            clientSecret: configService.getOrThrow<string>(
              'auth.google.clientSecret',
            ),
          },
        ),
    },
  ],
})
export class AuthenticationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(BetterAuthMiddleware).forRoutes(BETTER_AUTH_ROUTES);
  }
}
