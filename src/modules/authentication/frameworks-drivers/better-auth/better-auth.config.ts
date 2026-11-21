import { hash, verify, type Options } from '@node-rs/argon2';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '@/generated/prisma/client.js';

const ARGON2_COST: Options = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export const BETTER_AUTH = Symbol('BETTER_AUTH');

export type BetterAuth = ReturnType<typeof createAuth>;

export type BetterAuthProps = {
  secret: string;
  baseUrl: string;
  trustedOrigins: string[];
  passwordPepper: string;
};

export type GoogleProviderProps = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
};

export function createAuth(
  prisma: PrismaClient,
  props: BetterAuthProps,
  googleProvider: GoogleProviderProps,
) {
  const argon2Options = _toArgon2Options(props.passwordPepper);

  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: props.secret,
    baseURL: props.baseUrl,
    trustedOrigins: props.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      password: {
        hash: (password) => _hashPassword(password, argon2Options),
        verify: (data) => _verifyPassword(data, argon2Options),
      },
    },
    socialProviders: {
      google: {
        enabled: googleProvider.enabled,
        clientId: googleProvider.clientId,
        clientSecret: googleProvider.clientSecret,
      },
    },
    account: {
      encryptOAuthTokens: true,
    },
    advanced: {
      database: { generateId: 'uuid' },
    },
  });
}

function _toArgon2Options(passwordPepper: string): Options {
  return { ...ARGON2_COST, secret: Buffer.from(passwordPepper, 'utf8') };
}

function _hashPassword(password: string, options: Options): Promise<string> {
  return hash(password, options);
}

function _verifyPassword(
  { password, hash: passwordHash }: { password: string; hash: string },
  options: Options,
): Promise<boolean> {
  return verify(passwordHash, password, options);
}
