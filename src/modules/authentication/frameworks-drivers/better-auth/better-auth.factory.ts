import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, verify, type Options } from '@node-rs/argon2';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import {
  ERROR_REPORTER,
  type ErrorReporter,
} from '@/shared/application/ports/error-reporter.interface.js';
import { PrismaService } from '@/shared/frameworks-drivers/database/prisma.service.js';
import {
  EMAIL_SENDER,
  type EmailMessage,
  type EmailSender,
} from '../../application/ports/email-sender.interface.js';
import {
  toResetPasswordEmail,
  toVerificationEmail,
} from '../../interface-adapters/presenters/auth-email.presenter.js';
import type { BetterAuth } from './better-auth.types.js';

const ARGON2_COST: Options = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class BetterAuthFactory {
  private readonly argon2Options: Options;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(ERROR_REPORTER) private readonly errorReporter: ErrorReporter,
  ) {
    this.argon2Options = this.toArgon2Options();
  }

  create(): BetterAuth {
    return betterAuth<BetterAuthOptions>(this.toOptions());
  }

  private toOptions(): BetterAuthOptions {
    return {
      database: this.toDatabase(),
      secret: this.configService.getOrThrow<string>('auth.secret'),
      baseURL: this.configService.getOrThrow<string>('auth.url'),
      trustedOrigins:
        this.configService.getOrThrow<string[]>('http.corsOrigins'),
      emailAndPassword: this.toEmailAndPassword(),
      emailVerification: this.toEmailVerification(),
      socialProviders: this.toSocialProviders(),
      account: this.toAccount(),
      advanced: this.toAdvanced(),
    };
  }

  private toArgon2Options(): Options {
    const passwordPepper = this.configService.getOrThrow<string>(
      'auth.passwordPepper',
    );

    return { ...ARGON2_COST, secret: Buffer.from(passwordPepper, 'utf8') };
  }

  private toDatabase(): BetterAuthOptions['database'] {
    return prismaAdapter(this.prisma, { provider: 'postgresql' });
  }

  private toEmailAndPassword(): BetterAuthOptions['emailAndPassword'] {
    return {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: (password) => this.hashPassword(password),
        verify: (data) => this.verifyPassword(data),
      },
      sendResetPassword: ({ user, url }) =>
        this.sendEmail(
          toResetPasswordEmail({ to: user.email, name: user.name, url }),
        ),
    };
  }

  private hashPassword(password: string): Promise<string> {
    return hash(password, this.argon2Options);
  }

  private verifyPassword({
    password,
    hash: passwordHash,
  }: {
    password: string;
    hash: string;
  }): Promise<boolean> {
    return verify(passwordHash, password, this.argon2Options);
  }

  private toEmailVerification(): BetterAuthOptions['emailVerification'] {
    return {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) =>
        this.sendEmail(
          toVerificationEmail({ to: user.email, name: user.name, url }),
        ),
    };
  }

  private async sendEmail(message: EmailMessage): Promise<void> {
    try {
      await this.emailSender.send(message);
    } catch (error) {
      this.errorReporter.report(error);
      throw error;
    }
  }

  private toSocialProviders(): BetterAuthOptions['socialProviders'] {
    return {
      google: {
        enabled: this.configService.getOrThrow<boolean>('auth.google.enabled'),
        clientId: this.configService.getOrThrow<string>('auth.google.clientId'),
        clientSecret: this.configService.getOrThrow<string>(
          'auth.google.clientSecret',
        ),
      },
    };
  }

  private toAccount(): BetterAuthOptions['account'] {
    return { encryptOAuthTokens: true };
  }

  private toAdvanced(): BetterAuthOptions['advanced'] {
    return {
      database: { generateId: 'uuid' },
      backgroundTasks: {
        handler: (promise) => {
          void promise;
        },
      },
    };
  }
}
