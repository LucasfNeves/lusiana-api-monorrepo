import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as Sentry from '@sentry/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CLOSE_TIMEOUT_MS = 2000;
const PROJECT_DIRECTORY = process.cwd();

let workingDirectory: string;

async function runInstrument(): Promise<void> {
  vi.resetModules();
  await import('@/main/instrument.js');
}

function startedSentryOptions(): { dsn?: string; environment?: string } {
  const options = Sentry.getClient()?.getOptions();

  return { dsn: options?.dsn, environment: options?.environment };
}

// O instrument lê o `.env` do diretório atual; rodar em uma pasta vazia impede que o `.env` real do projeto entre no teste.
beforeEach(() => {
  workingDirectory = mkdtempSync(join(tmpdir(), 'instrument-'));
  process.chdir(workingDirectory);
  vi.stubEnv('SENTRY_DSN', undefined);
  vi.stubEnv('NODE_ENV', 'test');
});

afterEach(async () => {
  await Sentry.close(CLOSE_TIMEOUT_MS);
  vi.unstubAllEnvs();
  process.chdir(PROJECT_DIRECTORY);
  rmSync(workingDirectory, { recursive: true });
});

describe('instrument', () => {
  it('should start Sentry with the DSN and the environment of the process', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://public@sentry.invalid/1');
    vi.stubEnv('NODE_ENV', 'production');

    await runInstrument();

    expect(startedSentryOptions()).toEqual({
      dsn: 'https://public@sentry.invalid/1',
      environment: 'production',
    });
  });

  it('should load the .env file before starting Sentry', async () => {
    writeFileSync(
      join(workingDirectory, '.env'),
      'SENTRY_DSN=https://from-file@sentry.invalid/2\n',
    );

    await runInstrument();

    expect(startedSentryOptions()).toEqual({
      dsn: 'https://from-file@sentry.invalid/2',
      environment: 'test',
    });
  });

  it('should start Sentry without a DSN when none is configured', async () => {
    await runInstrument();

    expect(startedSentryOptions()).toEqual({
      dsn: undefined,
      environment: 'test',
    });
  });
});
