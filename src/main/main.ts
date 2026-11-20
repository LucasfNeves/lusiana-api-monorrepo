import './instrument.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);

  app.use(helmet());

  const corsOrigin = configService
    .getOrThrow<string>('http.corsOrigin')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(configService.getOrThrow<number>('app.port'));
}

void bootstrap();
