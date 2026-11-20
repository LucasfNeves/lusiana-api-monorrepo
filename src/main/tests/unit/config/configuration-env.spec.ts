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
        corsOrigin: 'https://loja.lusiana.com.br',
      },
    });
  });

  it('should default the app port to 3003 and the database port to 5435 when they are unset', () => {
    vi.stubEnv('PORT', undefined);
    vi.stubEnv('POSTGRES_PORT', undefined);

    const configuration = configurationEnv();

    expect(configuration.app.port).toBe(3003);
    expect(configuration.database.port).toBe(5435);
  });
});
