import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@/shared/frameworks-drivers/database/prisma.service.js';
import { FakeErrorReporter } from '@/shared/tests/fakes/fake-error-reporter.js';
import { BetterAuthFactory } from '../../../../frameworks-drivers/better-auth/better-auth.factory.js';
import type { BetterAuth } from '../../../../frameworks-drivers/better-auth/better-auth.types.js';
import { FakeEmailSender } from '../../../fakes/fake-email-sender.js';

const PASSWORD = 'uma-senha-forte-123';
const PASSWORD_PEPPER = 'better-auth-test-pepper-0123456789abcdef';
const ARGON2ID_PREFIX = /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/;
// O hash, a verificação da senha e a lista de provedores não consultam o banco.
const UNUSED_PRISMA = {} as PrismaService;
const USER = {
  id: '6f1c2b8e-3d4a-4b5c-9e7f-1a2b3c4d5e6f',
  email: 'cliente@exemplo.com',
  name: 'Maria',
  emailVerified: false,
  image: null,
  createdAt: new Date('2026-11-21T12:00:00Z'),
  updatedAt: new Date('2026-11-21T12:00:00Z'),
};
const LINK = 'http://localhost:3000/api/auth/verify-email?token=abc';

let emailSender: FakeEmailSender;
let errorReporter: FakeErrorReporter;
let sut: BetterAuth;

beforeEach(() => {
  emailSender = new FakeEmailSender();
  errorReporter = new FakeErrorReporter();
  sut = _createAuth();
});

describe('BetterAuthFactory', () => {
  it('should require a verified email, send it on sign-up and sign-in, sign in after verifying and revoke sessions on password reset', async () => {
    const context = await sut.$context;

    expect(context.options.emailAndPassword?.requireEmailVerification).toBe(
      true,
    );
    expect(
      context.options.emailAndPassword?.revokeSessionsOnPasswordReset,
    ).toBe(true);
    expect(context.options.emailVerification?.sendOnSignUp).toBe(true);
    expect(context.options.emailVerification?.sendOnSignIn).toBe(true);
    expect(context.options.emailVerification?.autoSignInAfterVerification).toBe(
      true,
    );
  });

  it.each([
    {
      email: 'verification',
      subject: 'Confirme seu e-mail na Lusiana',
      send: (auth: BetterAuth['options']) =>
        auth.emailVerification?.sendVerificationEmail?.({
          user: USER,
          url: LINK,
          token: 'abc',
        }),
    },
    {
      email: 'reset password',
      subject: 'Redefina sua senha da Lusiana',
      send: (auth: BetterAuth['options']) =>
        auth.emailAndPassword?.sendResetPassword?.({
          user: USER,
          url: LINK,
          token: 'abc',
        }),
    },
  ])(
    'should send the $email email to the user through the email port',
    async ({ subject, send }) => {
      await send(sut.options);

      const sentMessages = emailSender.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]?.to).toBe('cliente@exemplo.com');
      expect(sentMessages[0]?.subject).toBe(subject);
      expect(sentMessages[0]?.text).toContain('Olá, Maria.');
      expect(sentMessages[0]?.text).toContain(LINK);
    },
  );

  it.each([
    {
      email: 'verification',
      send: (auth: BetterAuth['options']) =>
        auth.emailVerification?.sendVerificationEmail?.({
          user: USER,
          url: LINK,
          token: 'abc',
        }),
    },
    {
      email: 'reset password',
      send: (auth: BetterAuth['options']) =>
        auth.emailAndPassword?.sendResetPassword?.({
          user: USER,
          url: LINK,
          token: 'abc',
        }),
    },
  ])(
    'should report a failed $email email and rethrow it untranslated',
    async ({ send }) => {
      const sesError = new Error('MessageRejected');
      vi.spyOn(emailSender, 'send').mockRejectedValue(sesError);

      await expect(send(sut.options)).rejects.toBe(sesError);
      expect(errorReporter.reported).toEqual([sesError]);
    },
  );

  it('should hand the email sending to the background without waiting for it', () => {
    const pendingEmail = new Promise<void>(() => undefined);

    const result = sut.options.advanced?.backgroundTasks?.handler(pendingEmail);

    expect(result).toBeUndefined();
  });

  it('should encrypt the OAuth tokens it stores', async () => {
    const context = await sut.$context;

    expect(context.options.account?.encryptOAuthTokens).toBe(true);
  });

  it('should not verify a password hashed under another pepper', async () => {
    const otherPepperAuth = _createAuth({
      passwordPepper: 'another-test-pepper-0123456789abcdef',
    });
    const otherPepperContext = await otherPepperAuth.$context;
    const passwordHash = await otherPepperContext.password.hash(PASSWORD);
    const context = await sut.$context;

    const isValid = await context.password.verify({
      hash: passwordHash,
      password: PASSWORD,
    });

    expect(isValid).toBe(false);
  });

  it('should keep the pepper out of the stored hash', async () => {
    const context = await sut.$context;

    const passwordHash = await context.password.hash(PASSWORD);

    expect(passwordHash).not.toContain(PASSWORD_PEPPER);
    expect(passwordHash).not.toContain(
      Buffer.from(PASSWORD_PEPPER).toString('base64').replace(/=+$/, ''),
    );
  });

  it.each([
    { case: 'enabled', googleEnabled: true, expected: ['google'] },
    { case: 'disabled', googleEnabled: false, expected: [] },
  ])(
    'should register the Google provider only when it is $case',
    async ({ googleEnabled, expected }) => {
      const auth = _createAuth({ googleEnabled });

      const context = await auth.$context;

      expect(context.socialProviders.map((provider) => provider.id)).toEqual(
        expected,
      );
    },
  );

  it('should hash passwords with Argon2id at the OWASP minimum cost', async () => {
    const context = await sut.$context;

    const passwordHash = await context.password.hash(PASSWORD);

    expect(passwordHash).toMatch(ARGON2ID_PREFIX);
  });

  it.each([
    { case: 'the right password', password: PASSWORD, expected: true },
    { case: 'a wrong password', password: 'outra-senha-123', expected: false },
  ])(
    'should answer $expected when verifying $case',
    async ({ password, expected }) => {
      const context = await sut.$context;
      const passwordHash = await context.password.hash(PASSWORD);

      const isValid = await context.password.verify({
        hash: passwordHash,
        password,
      });

      expect(isValid).toBe(expected);
    },
  );
});

function _createAuth({
  passwordPepper = PASSWORD_PEPPER,
  googleEnabled = true,
}: { passwordPepper?: string; googleEnabled?: boolean } = {}): BetterAuth {
  const configService = new ConfigService({
    http: { corsOrigins: ['http://localhost:3000'] },
    auth: {
      secret: 'better-auth-test-secret-0123456789abcdef',
      url: 'http://localhost:3000',
      passwordPepper,
      google: {
        enabled: googleEnabled,
        clientId: 'google-client-id.apps.googleusercontent.com',
        clientSecret: 'google-client-secret',
      },
    },
  });
  const betterAuthFactory = new BetterAuthFactory(
    UNUSED_PRISMA,
    configService,
    emailSender,
    errorReporter,
  );

  return betterAuthFactory.create();
}
