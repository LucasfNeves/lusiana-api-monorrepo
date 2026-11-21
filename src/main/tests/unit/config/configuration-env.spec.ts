import { afterEach, describe, expect, it, vi } from 'vitest';
import configurationEnv from '@/main/config/configuration-env.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('configurationEnv', () => {
  it('should group the environment variables by namespace with the ports as numbers', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PORT', '4001');
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://postgres:secret@localhost:5499/lusiana',
    );
    vi.stubEnv('POSTGRES_USER', 'postgres');
    vi.stubEnv('POSTGRES_PASSWORD', 'secret');
    vi.stubEnv('POSTGRES_DB', 'lusiana');
    vi.stubEnv('POSTGRES_PORT', '5499');
    vi.stubEnv('CORS_ORIGIN', 'https://loja.lusiana.com.br');
    vi.stubEnv(
      'BETTER_AUTH_SECRET',
      'better-auth-test-secret-0123456789abcdef',
    );
    vi.stubEnv('BETTER_AUTH_URL', 'https://api.lusiana.com.br');
    vi.stubEnv('PASSWORD_PEPPER', 'better-auth-test-pepper-0123456789abcdef');
    vi.stubEnv('GOOGLE_ENABLE', 'true');
    vi.stubEnv(
      'GOOGLE_CLIENT_ID',
      'google-client-id.apps.googleusercontent.com',
    );
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');
    vi.stubEnv('AWS_REGION', 'sa-east-1');
    vi.stubEnv('EMAIL_FROM', 'contato@lusiana.com.br');

    const configuration = configurationEnv();

    expect(configuration).toEqual({
      app: {
        port: 4001,
        env: 'production',
      },
      database: {
        url: 'postgresql://postgres:secret@localhost:5499/lusiana',
        user: 'postgres',
        password: 'secret',
        dbName: 'lusiana',
        port: 5499,
      },
      http: {
        corsOrigins: ['https://loja.lusiana.com.br'],
      },
      auth: {
        secret: 'better-auth-test-secret-0123456789abcdef',
        url: 'https://api.lusiana.com.br',
        passwordPepper: 'better-auth-test-pepper-0123456789abcdef',
        google: {
          enabled: true,
          clientId: 'google-client-id.apps.googleusercontent.com',
          clientSecret: 'google-client-secret',
        },
      },
      email: {
        region: 'sa-east-1',
        from: 'contato@lusiana.com.br',
      },
    });
  });

  it.each([
    { case: 'false', googleEnable: 'false' },
    { case: 'unset', googleEnable: undefined },
  ])(
    'should disable Google with empty credentials when GOOGLE_ENABLE is $case',
    ({ googleEnable }) => {
      vi.stubEnv('GOOGLE_ENABLE', googleEnable);
      vi.stubEnv('GOOGLE_CLIENT_ID', undefined);
      vi.stubEnv('GOOGLE_CLIENT_SECRET', undefined);

      const configuration = configurationEnv();

      expect(configuration.auth.google).toEqual({
        enabled: false,
        clientId: '',
        clientSecret: '',
      });
    },
  );

  it('should default the app port to 3000 and the database port to 5435 when they are unset', () => {
    vi.stubEnv('PORT', undefined);
    vi.stubEnv('POSTGRES_PORT', undefined);

    const configuration = configurationEnv();

    expect(configuration.app.port).toBe(3000);
    expect(configuration.database.port).toBe(5435);
  });

  it.each([
    {
      case: 'several origins with spaces and an empty entry',
      corsOrigin: ' https://loja.lusiana.com.br , ,http://localhost:3000',
      expected: ['https://loja.lusiana.com.br', 'http://localhost:3000'],
    },
    { case: 'an unset variable', corsOrigin: undefined, expected: [] },
  ])(
    'should split CORS_ORIGIN into trimmed origins given $case',
    ({ corsOrigin, expected }) => {
      vi.stubEnv('CORS_ORIGIN', corsOrigin);

      const configuration = configurationEnv();

      expect(configuration.http.corsOrigins).toEqual(expected);
    },
  );
});
