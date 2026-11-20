import type { ConfigModuleOptions } from '@nestjs/config';
import configurationEnv from './configuration-env.js';
import { validate } from './env.js';

export const CONFIG_MODULE_OPTIONS = {
  isGlobal: true,
  envFilePath: ['.env'],
  validate,
  load: [configurationEnv],
  cache: true,
  expandVariables: true,
} satisfies ConfigModuleOptions;
