import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validate } from '@/main/config/env.js';

const VALID_CONFIG = {
  NODE_ENV: 'development',
  PORT: '4001',
  POSTGRES_PORT: '5499',
  DATABASE_URL: 'postgresql://postgres:secret@localhost:5499/lusiana',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'secret',
  POSTGRES_DB: 'lusiana',
  CORS_ORIGIN: 'https://loja.lusiana.com.br',
  BETTER_AUTH_SECRET: 'better-auth-test-secret-0123456789abcdef',
  BETTER_AUTH_URL: 'https://api.lusiana.com.br',
  PASSWORD_PEPPER: 'better-auth-test-pepper-0123456789abcdef',
  GOOGLE_ENABLE: 'true',
  GOOGLE_CLIENT_ID: 'google-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  SENTRY_DSN: 'https://public-key@o1.ingest.sentry.io/42',
};

const VALIDATED_CONFIG = {
  ...VALID_CONFIG,
  PORT: 4001,
  POSTGRES_PORT: 5499,
  GOOGLE_ENABLE: true,
};

const VARIABLES = Object.keys(VALID_CONFIG);

beforeEach(() => {
  VARIABLES.forEach((variable) => vi.stubEnv(variable, undefined));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validate', () => {
  it('should return every variable with the ports as numbers and GOOGLE_ENABLE as a boolean', () => {
    const validatedConfig = validate(VALID_CONFIG);

    expect(validatedConfig).toEqual({
      NODE_ENV: 'development',
      PORT: 4001,
      POSTGRES_PORT: 5499,
      DATABASE_URL: 'postgresql://postgres:secret@localhost:5499/lusiana',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_DB: 'lusiana',
      CORS_ORIGIN: 'https://loja.lusiana.com.br',
      BETTER_AUTH_SECRET: 'better-auth-test-secret-0123456789abcdef',
      BETTER_AUTH_URL: 'https://api.lusiana.com.br',
      PASSWORD_PEPPER: 'better-auth-test-pepper-0123456789abcdef',
      GOOGLE_ENABLE: true,
      GOOGLE_CLIENT_ID: 'google-client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      SENTRY_DSN: 'https://public-key@o1.ingest.sentry.io/42',
    });
  });

  it('should default the ports and the CORS origin when they are absent', () => {
    const config = {
      ...VALID_CONFIG,
      PORT: undefined,
      POSTGRES_PORT: undefined,
      CORS_ORIGIN: undefined,
    };

    const validatedConfig = validate(config);

    expect(validatedConfig).toEqual({
      ...VALIDATED_CONFIG,
      PORT: 3000,
      POSTGRES_PORT: 5435,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('should read a variable from process.env when the config omits it', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://from-process-env');
    vi.stubEnv('PORT', '4000');
    const config = {
      ...VALID_CONFIG,
      DATABASE_URL: undefined,
      PORT: undefined,
    };

    const validatedConfig = validate(config);

    expect(validatedConfig).toEqual({
      ...VALIDATED_CONFIG,
      DATABASE_URL: 'postgresql://from-process-env',
      PORT: 4000,
    });
  });

  it('should prefer the config over process.env when both carry the variable', () => {
    vi.stubEnv('POSTGRES_USER', 'from-process-env');

    const validatedConfig = validate(VALID_CONFIG);

    expect(validatedConfig.POSTGRES_USER).toBe('postgres');
  });

  it.each([
    { case: 'absent', sentryDsn: undefined },
    { case: 'empty', sentryDsn: '' },
  ])(
    'should accept a SENTRY_DSN that is $case and leave it undefined',
    ({ sentryDsn }) => {
      const config = { ...VALID_CONFIG, SENTRY_DSN: sentryDsn };

      const validatedConfig = validate(config);

      expect(validatedConfig.SENTRY_DSN).toBeUndefined();
    },
  );

  it.each([
    { variable: 'NODE_ENV' },
    { variable: 'DATABASE_URL' },
    { variable: 'POSTGRES_USER' },
    { variable: 'POSTGRES_PASSWORD' },
    { variable: 'POSTGRES_DB' },
    { variable: 'BETTER_AUTH_SECRET' },
    { variable: 'BETTER_AUTH_URL' },
    { variable: 'PASSWORD_PEPPER' },
    { variable: 'GOOGLE_ENABLE' },
  ])('should throw naming $variable when it is missing', ({ variable }) => {
    const config = { ...VALID_CONFIG, [variable]: undefined };

    expect(() => validate(config)).toThrow(`property ${variable} has failed`);
  });

  it.each([
    { variable: 'NODE_ENV', value: 'staging' },
    { variable: 'PORT', value: 'abc' },
    { variable: 'PORT', value: '-1' },
    { variable: 'PORT', value: '65536' },
    { variable: 'POSTGRES_PORT', value: 'abc' },
    { variable: 'POSTGRES_PORT', value: '-1' },
    { variable: 'POSTGRES_PORT', value: '65536' },
    {
      variable: 'SENTRY_DSN',
      value: 'http://public-key@o1.ingest.sentry.io/42',
    },
    { variable: 'SENTRY_DSN', value: 'not-a-url' },
    {
      variable: 'BETTER_AUTH_SECRET',
      value: 'thirty-one-characters-long-0123',
    },
    { variable: 'BETTER_AUTH_URL', value: 'not-a-url' },
    { variable: 'BETTER_AUTH_URL', value: 'api.lusiana.com.br' },
    { variable: 'BETTER_AUTH_URL', value: 'ftp://api.lusiana.com.br' },
    { variable: 'PASSWORD_PEPPER', value: 'thirty-one-characters-long-0123' },
    { variable: 'GOOGLE_ENABLE', value: 'yes' },
    { variable: 'GOOGLE_ENABLE', value: '1' },
    { variable: 'GOOGLE_ENABLE', value: 'TRUE' },
  ])(
    'should throw naming $variable when its value is $value',
    ({ variable, value }) => {
      const config = { ...VALID_CONFIG, [variable]: value };

      expect(() => validate(config)).toThrow(`property ${variable} has failed`);
    },
  );

  it.each([
    { variable: 'GOOGLE_CLIENT_ID', value: undefined },
    { variable: 'GOOGLE_CLIENT_ID', value: '' },
    { variable: 'GOOGLE_CLIENT_SECRET', value: undefined },
    { variable: 'GOOGLE_CLIENT_SECRET', value: '' },
  ])(
    'should throw naming $variable when Google is enabled and it is $value',
    ({ variable, value }) => {
      const config = { ...VALID_CONFIG, [variable]: value };

      expect(() => validate(config)).toThrow(`property ${variable} has failed`);
    },
  );

  it('should accept Google disabled without its client id and secret', () => {
    const config = {
      ...VALID_CONFIG,
      GOOGLE_ENABLE: 'false',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: undefined,
    };

    const validatedConfig = validate(config);

    expect(validatedConfig).toEqual({
      ...VALIDATED_CONFIG,
      GOOGLE_ENABLE: false,
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
    });
  });

  it.each([
    {
      case: 'a 32-character secret',
      variable: 'BETTER_AUTH_SECRET',
      value: 'thirty-two-characters-long-01234',
    },
    {
      case: 'a localhost URL',
      variable: 'BETTER_AUTH_URL',
      value: 'http://localhost:3000',
    },
  ])('should accept $case', ({ variable, value }) => {
    const config = { ...VALID_CONFIG, [variable]: value };

    const validatedConfig = validate(config);

    expect(validatedConfig).toEqual({ ...VALIDATED_CONFIG, [variable]: value });
  });

  it.each([
    { port: '0', expected: 0 },
    { port: '65535', expected: 65535 },
  ])(
    'should accept the port $port at the range boundary',
    ({ port, expected }) => {
      const config = { ...VALID_CONFIG, PORT: port };

      const validatedConfig = validate(config);

      expect(validatedConfig.PORT).toBe(expected);
    },
  );
});
