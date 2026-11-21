import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateIf,
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

  @IsString()
  @MinLength(32)
  BETTER_AUTH_SECRET: string;

  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  BETTER_AUTH_URL: string;

  @IsString()
  @MinLength(32)
  PASSWORD_PEPPER: string;

  @IsBoolean()
  GOOGLE_ENABLE: boolean;

  @ValidateIf((env: EnvironmentVariables) => env.GOOGLE_ENABLE)
  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID?: string;

  @ValidateIf((env: EnvironmentVariables) => env.GOOGLE_ENABLE)
  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsNotEmpty()
  AWS_REGION: string;

  @IsEmail()
  EMAIL_FROM: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  SENTRY_DSN?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, {
    NODE_ENV: config.NODE_ENV ?? process.env.NODE_ENV,
    PORT: Number(config.PORT ?? process.env.PORT ?? 3000),
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
    BETTER_AUTH_SECRET:
      config.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: config.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL,
    PASSWORD_PEPPER: config.PASSWORD_PEPPER ?? process.env.PASSWORD_PEPPER,
    GOOGLE_ENABLE: _toBoolean(
      config.GOOGLE_ENABLE ?? process.env.GOOGLE_ENABLE,
    ),
    GOOGLE_CLIENT_ID:
      (config.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID) || undefined,
    GOOGLE_CLIENT_SECRET:
      (config.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET) ||
      undefined,
    AWS_REGION: config.AWS_REGION ?? process.env.AWS_REGION,
    EMAIL_FROM: config.EMAIL_FROM ?? process.env.EMAIL_FROM,
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

// Qualquer outro valor segue como veio, para o @IsBoolean recusá-lo com o nome da variável.
function _toBoolean(value: unknown): unknown {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}
