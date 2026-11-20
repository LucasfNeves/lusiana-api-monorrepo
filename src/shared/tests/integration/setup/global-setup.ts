import { execFileSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

// Mesma imagem do docker/compose.yml, para o teste rodar no que a aplicação usa.
const POSTGRES_IMAGE = 'postgres:16.0-alpine3.18';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(
  project: TestProject,
): Promise<() => Promise<void>> {
  const databaseContainer = await new PostgreSqlContainer(
    POSTGRES_IMAGE,
  ).start();
  const databaseUrl = databaseContainer.getConnectionUri();

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  project.provide('databaseUrl', databaseUrl);

  return async () => {
    await databaseContainer.stop();
  };
}
