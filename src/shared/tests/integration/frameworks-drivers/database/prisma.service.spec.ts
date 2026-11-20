import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '@/shared/frameworks-drivers/database/prisma.service.js';
import { makePrismaService } from '../../setup/prisma.js';

let sut: PrismaService;

beforeAll(() => {
  sut = makePrismaService();
});

afterAll(async () => {
  await sut.onModuleDestroy();
});

describe('PrismaService', () => {
  it('should run a query on the database of the configured url', async () => {
    const rows = await sut.$queryRaw<
      { result: number }[]
    >`SELECT 1::int AS result`;

    expect(rows).toEqual([{ result: 1 }]);
  });
});
