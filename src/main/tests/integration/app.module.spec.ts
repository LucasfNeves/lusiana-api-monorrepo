import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';

let app: INestApplication;
let baseUrl: string;

// O ConfigModule lê o ambiente quando o AppModule é importado, então as variáveis vêm antes do import.
beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('PORT', '0');
  vi.stubEnv('DATABASE_URL', inject('databaseUrl'));
  vi.stubEnv('POSTGRES_PORT', '5432');
  vi.stubEnv('POSTGRES_USER', 'test');
  vi.stubEnv('POSTGRES_PASSWORD', 'test');
  vi.stubEnv('POSTGRES_DB', 'test');
  vi.stubEnv('CORS_ORIGIN', 'http://localhost:3000');
  vi.stubEnv('BETTER_AUTH_SECRET', 'better-auth-test-secret-0123456789abcdef');
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');
  vi.stubEnv('PASSWORD_PEPPER', 'better-auth-test-pepper-0123456789abcdef');
  vi.stubEnv('GOOGLE_ENABLE', 'false');
  vi.stubEnv('SENTRY_DSN', 'https://public@sentry.invalid/1');
  const { AppModule } = await import('@/main/app.module.js');

  app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

describe('AppModule', () => {
  it('should answer a route that does not exist in the error shape of the filter', async () => {
    const response = await fetch(`${baseUrl}/route-that-does-not-exist`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /route-that-does-not-exist',
      details: [],
      timestamp: expect.any(String),
      path: '/route-that-does-not-exist',
    });
  });

  it('should hand the Better Auth routes to Better Auth', async () => {
    const response = await fetch(`${baseUrl}/api/auth/ok`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
