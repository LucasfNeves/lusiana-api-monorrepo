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
  SENTRY_DSN: 'https://public-key@o1.ingest.sentry.io/42',
};

const VARIABLES = Object.keys(VALID_CONFIG);

beforeEach(() => {
  VARIABLES.forEach((variable) => vi.stubEnv(variable, undefined));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validate', () => {
  it('should return every variable with the ports converted to numbers', () => {
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
      ...VALID_CONFIG,
      PORT: 3003,
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
      ...VALID_CONFIG,
      DATABASE_URL: 'postgresql://from-process-env',
      PORT: 4000,
      POSTGRES_PORT: 5499,
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
  ])(
    'should throw naming $variable when its value is $value',
    ({ variable, value }) => {
      const config = { ...VALID_CONFIG, [variable]: value };

      expect(() => validate(config)).toThrow(`property ${variable} has failed`);
    },
  );

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
