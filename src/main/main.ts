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

  app.enableCors({
    origin: configService.getOrThrow<string[]>('http.corsOrigins'),
    credentials: true,
  });

  await app.listen(configService.getOrThrow<number>('app.port'));
}

void bootstrap();
