import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export const ENVIRONMENTS = ['development', 'production', 'test'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  @IsIn(ENVIRONMENTS, {
    message: `NODE_ENV must be one of the following values: ${ENVIRONMENTS.join(', ')}`,
  })
  NODE_ENV: Environment;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsNumber()
  @Min(0)
  @Max(65535)
  POSTGRES_PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USER: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  SENTRY_DSN?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, {
    NODE_ENV: config.NODE_ENV ?? process.env.NODE_ENV,
    PORT: Number(config.PORT ?? process.env.PORT ?? 3003),
    POSTGRES_PORT: Number(
      config.POSTGRES_PORT ?? process.env.POSTGRES_PORT ?? 5435,
    ),
    DATABASE_URL: config.DATABASE_URL ?? process.env.DATABASE_URL,
    POSTGRES_USER: config.POSTGRES_USER ?? process.env.POSTGRES_USER,
    POSTGRES_PASSWORD:
      config.POSTGRES_PASSWORD ?? process.env.POSTGRES_PASSWORD,
    POSTGRES_DB: config.POSTGRES_DB ?? process.env.POSTGRES_DB,
    CORS_ORIGIN:
      config.CORS_ORIGIN ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    SENTRY_DSN: (config.SENTRY_DSN ?? process.env.SENTRY_DSN) || undefined,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
