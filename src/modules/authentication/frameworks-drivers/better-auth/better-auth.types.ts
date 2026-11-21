import type { Auth, BetterAuthOptions } from 'better-auth';

export const BETTER_AUTH = Symbol('BETTER_AUTH');

export type BetterAuth = Auth<BetterAuthOptions>;
