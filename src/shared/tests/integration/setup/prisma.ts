import { ConfigService } from '@nestjs/config';
import { inject } from 'vitest';
import { PrismaService } from '@/shared/frameworks-drivers/database/prisma.service.js';

export function makePrismaService(): PrismaService {
  const configService = new ConfigService({
    database: { url: inject('databaseUrl') },
  });

  return new PrismaService(configService);
}
