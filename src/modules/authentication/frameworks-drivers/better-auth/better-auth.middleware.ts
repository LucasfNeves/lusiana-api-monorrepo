import type { IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { BETTER_AUTH, type BetterAuth } from './better-auth.config.js';

@Injectable()
export class BetterAuthMiddleware implements NestMiddleware {
  private readonly handler: (
    req: IncomingMessage,
    res: ServerResponse,
  ) => Promise<void>;

  constructor(@Inject(BETTER_AUTH) betterAuth: BetterAuth) {
    this.handler = toNodeHandler(betterAuth);
  }

  use(req: IncomingMessage, res: ServerResponse): Promise<void> {
    return this.handler(req, res);
  }
}
