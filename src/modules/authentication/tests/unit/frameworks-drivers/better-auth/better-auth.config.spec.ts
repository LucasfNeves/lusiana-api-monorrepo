import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@/generated/prisma/client.js';
import {
  createAuth,
  type BetterAuth,
} from '../../../../frameworks-drivers/better-auth/better-auth.config.js';

const PASSWORD = 'uma-senha-forte-123';
const ARGON2ID_PREFIX = /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/;
// O hash, a verificação da senha e a lista de provedores não consultam o banco.
const UNUSED_PRISMA = {} as PrismaClient;
const BETTER_AUTH_PROPS = {
  secret: 'better-auth-test-secret-0123456789abcdef',
  baseUrl: 'http://localhost:3000',
  trustedOrigins: ['http://localhost:3000'],
  passwordPepper: 'better-auth-test-pepper-0123456789abcdef',
};
const GOOGLE_PROVIDER = {
  enabled: true,
  clientId: 'google-client-id.apps.googleusercontent.com',
  clientSecret: 'google-client-secret',
};

let sut: BetterAuth;

beforeEach(() => {
  sut = createAuth(UNUSED_PRISMA, BETTER_AUTH_PROPS, GOOGLE_PROVIDER);
});

describe('createAuth', () => {
  it('should encrypt the OAuth tokens it stores', async () => {
    const context = await sut.$context;

    expect(context.options.account.encryptOAuthTokens).toBe(true);
  });

  it('should not verify a password hashed under another pepper', async () => {
    const otherPepperAuth = createAuth(
      UNUSED_PRISMA,
      {
        ...BETTER_AUTH_PROPS,
        passwordPepper: 'another-test-pepper-0123456789abcdef',
      },
      GOOGLE_PROVIDER,
    );
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

    expect(passwordHash).not.toContain(BETTER_AUTH_PROPS.passwordPepper);
    expect(passwordHash).not.toContain(
      Buffer.from(BETTER_AUTH_PROPS.passwordPepper)
        .toString('base64')
        .replace(/=+$/, ''),
    );
  });

  it.each([
    { case: 'enabled', enabled: true, expected: ['google'] },
    { case: 'disabled', enabled: false, expected: [] },
  ])(
    'should register the Google provider only when it is $case',
    async ({ enabled, expected }) => {
      const auth = createAuth(UNUSED_PRISMA, BETTER_AUTH_PROPS, {
        ...GOOGLE_PROVIDER,
        enabled,
      });

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
