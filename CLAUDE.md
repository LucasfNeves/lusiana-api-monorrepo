# lusiana-api-monorrepo

Back-end of Lusiana Joias as a **modular monolith**: one NestJS process, one PostgreSQL database with one schema per module. NestJS 12 + Prisma 7 + PostgreSQL 16, ESM, Clean Architecture inside each module, DDD. Created on 2026-11-20 from the conventions of `lusiana-estoque`, which moves in here later as the `stock` module.

The first modules are `authentication` (Better Auth), `user-access` (roles and permissions) and `customers` (customer profile). Today they are empty folders. Design records live in the Obsidian vault, not in this repo: `Spec - Autenticação com Better Auth`, `Guia - Começar o módulo de autenticação` and the `Lusiana E-commerce` overview (section "Arquitetura: monólito modular").

This file is the source of truth for how code is written here. Before writing, read the section for the layer you are touching.

## Stack

- TypeScript 6.0 (pinned to `~6.0`, because `typescript-eslint` accepts only `<6.1`) with `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `module: NodeNext`, and `"type": "module"`.
- `nest build` uses the SWC builder plus a tsc typecheck. The entry file is `src/main/main.ts` (`entryFile: "main/main"` in `nest-cli.json`). Vitest 4 runs through `unplugin-swc`, because esbuild cannot emit decorator metadata.
- The HTTP stack is Express with `helmet` and CORS from env. It has a global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` and a global catch-all `ErrorCodeExceptionFilter`, so every error answers in one shape. Both are registered in `AppModule` (`APP_PIPE`, `APP_FILTER`), not in `main.ts`, so a spec that boots `AppModule` gets them too.
- There is no authentication yet: every route is public until the `authentication` and `user-access` modules land.
- Errors that answer 5xx are reported to Sentry (`@sentry/nestjs`), behind the `ErrorReporter` port. `src/main/instrument.ts` starts the SDK and is the first import of `main.ts`. Tracing and profiling are off.
- Persistence is Prisma 7 with `@prisma/adapter-pg` and `prisma.config.ts`. The client is generated into `src/generated/prisma`, which is committed and ignored by lint and by Prettier (`.prettierignore`). The datasource lists one PostgreSQL schema per module (`schemas = [...]`), and every model and enum carries `@@schema(...)`: with `schemas` set, a model without it fails `prisma validate` (checked 2026-11-20). Multi-schema is GA since Prisma 6.13.
- ESLint (`eslint.config.mjs`) runs `recommendedTypeChecked` with `--max-warnings=0`, so every `warn` rule acts as an error. `no-explicit-any` and `no-console` are on. `no-unnecessary-condition` is on: a condition the types say is always true or always false fails lint. `strict-boolean-expressions` is on for numbers: a number used as a condition fails lint, because `0` would read as "absent"; compare explicitly. Strings, nullable strings, nullable objects and nullable booleans stay allowed. Prettier (`.prettierrc`) is enforced at commit time: the pre-commit hook runs `lint-staged` (`prettier --write` on staged `src/**/*.ts`), then `pnpm validate`; commitlint checks commit messages.
- Local ports: the API listens on 3000 and Postgres on 5435, so this repo runs next to the others (`lusiana-estoque` on 3001 and 5433, `lusiana-search` on 3002, other Postgres instances on 5432 to 5434). Lucas moved the API from 3003 to 3000 on 2026-11-20, so the Google OAuth client points at `http://localhost:3000/api/auth/callback/google`; the front, which used 3000, needs another port.

## Commands

```bash
pnpm dev          # nest start --watch
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint src, --max-warnings=0
pnpm test         # unit project only, no Docker  (also test:unit)
pnpm test:integration   # integration project: real Postgres through Testcontainers; needs Docker running
pnpm test:cov     # both projects with one merged coverage report; needs Docker  (test:ci is the same)
pnpm build        # nest build (swc emit + tsc typecheck)
pnpm format       # prettier --write on src  (format:check only reports)
pnpm validate     # lint + typecheck + test:ci — the pre-commit hook runs lint-staged, then this
```

A change is done when `pnpm typecheck && pnpm lint && pnpm test` all pass. Run `pnpm test:integration` as well when the change touches a gateway that reaches the database, `prisma/schema.prisma` or a migration. Coverage thresholds in `vitest.config.ts` are a floor of 90 for lines, functions, branches and statements, measured on the merged report of both projects.

`prisma generate` is fine to run after a schema change, and its output gets committed. The following need an explicit request (global rules): `prisma migrate|db`, `pnpm db:*`, `docker:down:volumes`, `docker:reset`.

## Modular monolith

The reference is `kgrzybek/modular-monolith-with-ddd` (README sections 3.1, 3.7 and 3.9, checked 2026-11-20). Its rules, as applied here:

1. **One database, one schema per module.** "Each Module has it's own data in a separate schema - shared data is not allowed." A module never reads, joins or writes another module's schema.
2. **No transaction spans two modules.**
3. **Modules talk only through integration events.** "Modules communicate each other only asynchronously using Events Bus"; "direct method calls are not allowed". A module may import another module's `integration-events/` and nothing else. The bus is not built yet: it will be the in-process Mediator with an outbox in the publishing module and an inbox in the consuming one (at-least-once delivery, eventual consistency). It enters with the first real cross-module event (account deletion), not before.
4. **`src/main/` is the only folder that knows every module.** It composes the application: imports each module's Nest module, merges each module's error field map, and hosts the global guard. Calling a module through its public interface from `main/` is allowed; a module calling another module is not.
5. **`src/shared/` holds the building blocks** every module uses, like the reference's `src/BuildingBlocks` (`Domain`, `Application`, `Infrastructure`; checked in its repository 2026-11-20): the `DomainError` base, the `ErrorReporter` port and its Sentry adapter, the validation messages of the `Validate*` classes, `PrismaService`. It imports only from itself, never from a module or from `main/`. What only the HTTP host needs (the error filter, the validation exception, the error field map) lives in `main/http/`, as the reference keeps exception handling and authorization in its API project, not in `BuildingBlocks`. A building block enters `shared/` only when a module uses it: the reference's `Entity`, `ValueObject`, event bus, outbox, inbox and unit of work come in with their first consumer.
6. **One Prisma client, one owner per table.** Prisma generates a single client with every module's models, so nothing in the code stops a module's gateway from reading another module's tables. The reference gives each module its own database context, limited to its schema. Here the rule is a convention: a gateway touches only its own module's models. An architecture test will check it once the tool is chosen.
7. **Services outside the monolith** (`lusiana-search`, the future payment service in Go) are reached through RabbitMQ, with their own message contract. Integration events between modules never go through RabbitMQ.

## Layout

```text
src/
  main/                        composition root
    main.ts, instrument.ts, app.module.ts
    config/                    env.ts (validation), configuration-env.ts (namespaced config), config-module-options.ts
    http/                      ErrorCodeExceptionFilter, ValidationFailedException, http-error-messages.const.ts, error-fields.const.ts (ERROR_FIELDS + the merged map)
    tests/unit/, tests/integration/
  shared/                      building blocks, same four layers
    domain/                    errors/domain-error.ts (DomainError, ERROR_KIND)
    application/ports/         error-reporter.interface.ts
    interface-adapters/        constants/validation-message.ts, gateways/sentry-error-reporter.adapter.ts
    frameworks-drivers/        database/prisma.service.ts
    shared.module.ts           provides and exports PrismaService and ERROR_REPORTER
    tests/                     setup.ts, fakes/, unit/, integration/ (setup/global-setup.ts, setup/prisma.ts)
  modules/<module>/            kebab-case: authentication, user-access, customers
    domain/                    entities/, value-objects/, errors/, constants/, types/, services/
    application/               use-cases/, ports/ (each port with its Symbol), types/
    interface-adapters/        controllers/ (with the Validate* classes), presenters/, gateways/
    frameworks-drivers/        what only configures a library: Better Auth config and middleware, SDK clients
    integration-events/        the contracts this module publishes to the others
    tests/                     unit/, integration/, arch/
    <module>.module.ts         the Nest module: registers controllers and providers, exports only the public interface
  generated/prisma/            generated Prisma client
prisma/schema.prisma, prisma/migrations/
docker/compose.yml
```

## Layers inside a module

Clean Architecture, with the layer names of `~/FIAP/DVLT-arquitetura-de-software-aula1/node-cleanArch-lucas` (decided by Lucas 2026-11-20). Outer layers know inner ones, never the reverse.

- **`domain/`** — entities, value objects, domain errors, Domain Services. Imports only from its own `domain/`, `shared/domain/` and `node:*`: never `@nestjs/*`, Prisma or an outer layer.
- **`application/`** — use cases and the ports they need (`ports/`), plus the port and contract types (`types/`). Imports from `domain/` and `shared/`; imports `frameworks-drivers/` or `interface-adapters/` only for module wiring.
- **`interface-adapters/`** — translation between the application and the outside, and never a business rule. Three kinds of piece: **controllers** (HTTP request → use case call, with the `Validate*` classes), **presenters** (use case output → response) and **gateways** (implementations of the ports: Prisma repositories and DAOs, adapters for email, storage, queues). A gateway speaks both languages: the application's types and the outside's.
- **`frameworks-drivers/`** — the lowest level: what only starts or configures a tool and knows nothing of the business (the Better Auth configuration, an SDK client). It holds little code. Lucas's note *Clean Architecture*: "um `AccountRepository` é um Interface Adapter que faz a ponte entre o Use Case e o banco", and the connection itself sits apart, in Frameworks and Drivers.

The test to place a file: **does it translate between one of our ports and the outside?** Then it is an interface adapter (`gateways/`). **Does it only start or configure the tool?** Then it is frameworks-drivers.

Controllers live inside their module, in `interface-adapters/controllers/` (decided by Lucas 2026-11-20), not in a top-level API layer as in the Grzybek reference: each module is a complete slice, and extracting it into a service later takes its HTTP along. A controller calls only its own module's use cases.

## Adding a feature

1. **Domain.** Entity in `domain/entities/`, VOs in `domain/value-objects/`, errors in `domain/errors/<area>-error.ts` with their messages in the module's `domain/constants/error-messages.ts`.
2. **Port.** In `application/ports/<name>.interface.ts`, holding the `Symbol` and the interface.
3. **Use case.** In `application/use-cases/<verb>-<thing>.usecase.ts`, with its spec in `tests/unit/` and any fake in `tests/fakes/`.
4. **Persistence.** The Prisma model with `@@schema("<module schema>")`, a migration, and the gateway in `interface-adapters/gateways/`, registered in the module as `{ provide: SYMBOL, useClass }`.
5. **HTTP.** `Validate*` class and controller in `interface-adapters/controllers/`, presenter in `interface-adapters/presenters/`, then import the module in `main/app.module.ts`. If a new error refers to a request field, add it to the module's error field map (declared with `satisfies Record<string, readonly string[]>`, no import) and merge that map in `main/http/error-fields.const.ts`.
6. **New env var.** Three places: `.env.example`, `EnvironmentVariables` + `validate()` in `main/config/env.ts`, and a namespaced key in `main/config/configuration-env.ts`. Read it with `configService.getOrThrow<T>('namespace.key')`. The exception is `SENTRY_DSN`: `instrument.ts` runs before the Nest container exists, so it loads `.env` itself and reads `process.env`.

## Domain

- **Entities.** The constructor is `private` and builds its VOs internally. Every instance comes from a named static factory: `create` for a new instance, `restore(snapshot)` to rehydrate from persistence. Invariants that span several fields are checked in the constructor, so `create` and `restore` share them; a command that changes those fields calls the same check.
- **State.** Fields are `private`, and `readonly` unless a command mutates them. Accessors are `getX()` and return primitives or snapshot items, so a VO never leaves the entity; questions are `isX()` / `hasX()`. Commands are verbs that change the entity itself and never return a new instance; they validate first and mutate last, so a failed command leaves the state untouched. A value derived from other fields is calculated when read, not stored. A shared precondition becomes a private `assertX()`.
- **Output.** `toSnapshot()` returns `<Name>Snapshot`: the state and nothing else, everything `restore()` needs. An entity has no `toResponse()`: the module's presenter maps the use case output to the response, as an object literal written field by field (never a spread or a cast of a snapshot). Use cases return the snapshot, never the entity.
- **Ids, dates and version.** Entities generate their own id with `randomUUID()`. Dates and version belong to the database: the entity never reads the clock, and every repository write rereads the row.
- **Copies.** Collections are copied on the way in and on the way out.
- **Value objects.** The constructor is public and normalizes, validates and stores a `private readonly` value read through `getValue()`. A VO whose value is converted before it is stored has a `private` constructor, a converting factory (`create`) and a `restore(stored)` that only checks. An optional field whose empty value means "not set" gets a `fromNullable(value)` factory. A VO never holds entities.
- **Every business rule lives in the domain**, not only in a `Validate*` class. A limit both layers need is a const in the module's `domain/constants/`.
- **Naming.** `*Entity` in `*.entity.ts`, `*VO` in `*.vo.ts`, Domain Services named for what they do (`*Validator`, `*Calculator`, never a bare `*Service`). Static factories are `create` / `restore`, never `of`.
- **No inline construction.** Never build an entity or VO inside an argument list; bind it to a const named after the thing first.

## Types

- **API contract** in the module's `application/types/`: `<Verb><Thing>Request` (body), `<Verb><Thing>Query` (URL parameters), `<Thing>Response` (what every audience sees), `<Audience><Thing>Response` (adds fields for one audience, never `Omit` to hide one), `Page<T>`. Dates in responses are `string`.
- **Internal:** `<Thing>Snapshot`, `<Thing>Reference` (minimal lookup result), `<Thing>Props` (constructor parameter object), `New<Thing>` / `<Thing>Changes` (what a use case hands to a factory or command, every optional field already `null`).
- A use case takes the contract type its route takes; the `Validate*` class `implements` it. Before the entity, the use case maps it field by field to the domain type.
- A list of references is an array of ids, never an array of one-field objects.
- Never `*Dto`, `*PublicData`, `*Input` or `*Output`. A type nobody imports gets deleted.
- Constants are `as const` objects with a same-named derived type; no TS `enum`.

## Use cases

- One class per operation: `<Verb><Thing>UseCase` in `<verb>-<thing>.usecase.ts`, `@Injectable()`, with a single public `execute()` that declares its return type. Only a use case has an `execute()` method.
- One or two primitives are passed positionally; more than that is the route's contract type.
- Flow: map the input to the domain type, build VOs/entities, load, run guard clauses, persist, return. Every validation happens before the first write. Independent lookups run with `Promise.all`. When two checks can fire at once, their order is a decision and a spec pins it.
- A guard clause is `if (!x) { throw new XNotFoundError(); }`, always with braces, followed by a blank line.
- The gateway already throws the `DomainError` of the constraint the database refused, so a use case calls the write directly, with no `try/catch`. A check-then-write is never enough on its own: the unique constraint is the real guard.

## Controllers and Validate classes

- A controller constructor takes only `*UseCase` classes of its own module, injected with no `Symbol`. Handlers stay thin: map params and body into `useCase.execute(...)` and return the result through the presenter. Only HTTP concerns (status codes) live in the controller.
- Route prefixes are singular: `@Controller('customer')`. `@HttpCode(HttpStatus.X)` when the default is wrong; a command with no body returns `NO_CONTENT` and `Promise<void>`. A route goes live only when its use case is real.
- UUID route params always go through `new ParseUUIDPipe()`.
- `Validate<Verb><Thing>` in `<verb>-<thing>.validate.ts` validates with class-validator and `implements` the contract type. Import it as a value, never `import type`, or `ValidationPipe` sees nothing. Each decorator takes its message from `ValidationMessages` (`shared/interface-adapters/constants/validation-message.ts`) with the field name in Portuguese; a missing message becomes a new function there. Nested arrays use `@ValidateNested({ each: true })`, `@Type(() => ValidateX)` and an `@ArrayMaxSize`.

## Errors

**No file outside `main/http/` may import an exception from `@nestjs/common`.**

- Every expected error subclasses `DomainError` (`shared/domain/errors/domain-error.ts`) with a `code` and a `kind`:

  ```ts
  export class CustomerNotFoundError extends DomainError {
    readonly code = 'CUSTOMER_NOT_FOUND';
    readonly kind = ERROR_KIND.NOT_FOUND;

    constructor() {
      super(CustomerErrorMessages.CUSTOMER_NOT_FOUND);
    }
  }
  ```

- `code` equals the messages key, and the class name is that key in PascalCase plus `Error`. `kind` is one of `INVALID_INPUT | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | UNEXPECTED`; leave the line out for `UNEXPECTED` (a broken invariant, 500). The domain knows no HTTP: the filter maps `kind` to a status.
- Messages live in the module's `domain/constants/error-messages.ts`, in pt-BR, ending with a period. Never an inline string in an error class or a `throw`. A parameterized message is a function.
- Database errors are translated in the gateway, straight into a `DomainError`.
- **Response shape.** `ErrorCodeExceptionFilter` catches everything and answers `{ statusCode, code, message, details, timestamp, path }`. `details` is a list of `{ field, message }`, empty when the error is not about one field.
  - A `DomainError` keeps its `code` and `message`. Its field comes from the `ERROR_FIELDS` map injected into the filter: each module exports its own map (error code → candidate fields in order of preference) and `main/http/error-fields.const.ts` merges them. The detail points to the first candidate the request sent, in the body or the query. The filter never lists a module's codes itself (changed from `lusiana-estoque`, where the map sat inside the filter).
  - A body rejected by `ValidationPipe` answers `VALIDATION_FAILED` with one detail per broken rule and the exact path (`items.0.quantity`).
  - Any other Nest `HttpException` keeps its status, and `code` is the status name.
  - Anything else answers `UNEXPECTED_ERROR` with status 500 and a generic message.
  - Every 5xx is logged with its stack and sent to `ErrorReporter`; a 4xx is neither. Do not register `SentryGlobalFilter` or call the Sentry SDK elsewhere.

## Ports and gateways

- Ports use property signatures and live in `application/ports/` with their `Symbol` (SCREAMING_SNAKE). A port is named for its role, with no `I` prefix; the implementation carries what makes it concrete (`PrismaCustomerRepository`, `SesEmailSenderAdapter`). The file is `*.interface.ts`.
- An area with an entity gets a repository (returns entities); a table with no entity gets a DAO. Every repository and DAO has a port and is registered by its Symbol.
- Reads use a module-level `select` / `include` const and an `orderBy` that never ties. A write that spans several tables runs in a transaction.
- **Prisma schema conventions:** model names PascalCase and singular, fields camelCase with `@map("snake_case")`, tables `@@map("snake_case_plural")`, `@@schema(...)` on every model and enum. Ids are `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` unless the entity generates the id first. Timestamps are `@db.Timestamptz`. Money is `Decimal @db.Decimal(10, 2)`. Every schema change ships with its migration in the same commit. Import the client from `@/generated/prisma/client.js`.

## Code style

- **Language.** Identifiers in English. User-facing messages and code comments in pt-BR. Test titles in English.
- **Comments** are rare: only a *why* the code cannot say, a single line above the declaration or a `/** */` block. Never narrate what the code does.
- **Imports.** ESM, always with the `.js` extension. Anything outside the current module folder is imported through `@/`; `./` and `../` only inside the same module. A type-only import uses `import type`; mixing `import { Value, type T }` is fine when `Value` is a runtime value.
- **Formatting** follows `.prettierrc`; Prettier is the only authority on layout.
- **Control flow.** `if` always has braces (`curly: 'all'`). Prefer an early return or throw; never an `else` after a `throw`. Lint requires a blank line before every `return` and after every `if`.
- **`interface` only for ports.** Everything else is a `type`.
- **Constants** are UPPER_SNAKE. A limit used by one file stays in that file; a shared one goes in the module's `constants/`.
- **Classes.** Private members carry no prefix. A function outside a class that is not exported carries the `_` prefix. A helper only one class uses is a private method of that class. Injected dependencies are `private readonly`. Public methods declare their return type.
- **Names.** Suffixes: `*UseCase`, `*Entity`, `*VO`, `*Error`, `*Translator`, `Prisma*Repository`, `Prisma*Dao`, `*Adapter`, `*Request` / `*Query` / `*Response`, `*Snapshot`, `*Reference`, `*Props`, `Validate*` (prefix), `*Controller`, `*Middleware`, `*Module`. Files are kebab-case `<name>.<kind>.ts`, kind one of `usecase`, `entity`, `vo`, `validator`, `validate`, `controller`, `middleware`, `module`, `repository`, `dao`, `adapter`, `translator`, `filter`, `exception`, `interface`, `config`, `const`, `types`, `presenter`, `service`, `spec`. A variable is named after the thing it holds.
- **Clean Code is the reference** (Robert C. Martin) for names, functions and comments. Functions do one thing at one level of abstraction; a function that coordinates steps reads as the list of those steps. Order members by the Stepdown Rule: a caller above what it calls, in the order it calls them.
- **Abstractions.** A new class, port or collaborator with only one consumer gets rejected, even if it removes lines. Count consumers before proposing one.

## Tests

- **Location.** Tests live inside the area they test, as in the Grzybek reference: `src/<area>/tests/unit/`, `src/<area>/tests/integration/` and `src/<area>/tests/arch/` (architecture tests; the tool is not chosen yet). Fakes go in `tests/fakes/`, builders in `tests/utils/`. Inside `tests/`, mirror the path of the file under test (`tests/unit/interface-adapters/filters/...`). Test helpers are imported by relative path; `@/` maps to `src/`.
- **Vitest.** Two projects in `vitest.config.ts`: `unit` collects `src/**/tests/unit/**/*.spec.ts`; `integration` collects `src/**/tests/integration/**/*.spec.ts` and runs `src/shared/tests/integration/setup/global-setup.ts`. `setupFiles` is `src/shared/tests/setup.ts` (loads `reflect-metadata`). `globals: false`, so import from `vitest` explicitly. `clearMocks: true` is set; never call `vi.clearAllMocks()`. `tsconfig.build.json` keeps `src/**/tests/**` out of the build.
- **Shape.** `.spec.ts` files, `it('should ...')` in English, the target named `sut`. Arrange/Act/Assert separated by blank lines, never comments. `sut` and the doubles declared at module scope and recreated in `beforeEach`.
- **Doubles.** A double may not stand in for what the assertion is trying to prove. State gets a fake with `seed()`; exceptional behavior the fake cannot produce gets `vi.spyOn(...)`. A port that is not a repository gets a deterministic fake class (`FakeErrorReporter`), never an inline object or a bag of `vi.fn()`. Fakes implement the port, return a `Promise` explicitly without `async`, hand back copies and reproduce database constraints.
- **Data.** Ids are fixed UUID consts in a `test-ids.ts`, never an inline string. Tables use `it.each` with objects.
- **Clock.** `const NOW = new Date('...Z')`; `vi.useFakeTimers().setSystemTime(NOW)` in `beforeEach`, `vi.useRealTimers()` in `afterEach`. Assert timestamps by value.
- **Assertions.** Every error test asserts the right domain error (`rejects.toThrow(SomeError)`) **and** that nothing was written. `rejects.toBe(sameInstance)` for "propagates untranslated". Whole objects with `toEqual`. `not.toBeNull()` for repository results. Never `await` a promise before `.rejects`.
- **Integration.** `global-setup.ts` starts one throwaway Postgres (the image of `docker/compose.yml`), runs `prisma migrate deploy` and provides `inject('databaseUrl')`. A spec builds the real class with `new` (`makePrismaService()` from `shared/tests/integration/setup/prisma.ts`). Files run one at a time because they share the database. Assert what only the database can answer. An HTTP spec (reference: `src/main/tests/integration/app.module.spec.ts`) stubs every environment variable before importing `AppModule`, boots it with `NestFactory.create`, listens on port 0 and calls it with `fetch`; keep it a smoke test.
- **Scenarios** every use case covers: happy path, each domain error, error precedence, neighbors left untouched, and infra failure propagating untranslated. Before accepting a green test, ask which wrong implementation it would reject.
- Do not create markdown files under `src/`.

## Known deviations — do not copy

- **Better Auth routes.** `AuthenticationModule` applies `BetterAuthMiddleware` (`frameworks-drivers/better-auth/better-auth.middleware.ts`, a wrapper around `toNodeHandler` from `better-auth/node` that never calls `next()`) to `api/auth/*path`, so these routes run before guards, skip `ValidationPipe`, so these routes skip `ValidationPipe`, and their 4xx answers keep Better Auth's own shape (`{ message, code }`). A 5xx thrown there still reaches `ErrorCodeExceptionFilter`. No `@thallesp/nestjs-better-auth`: removed on 2026-11-20 in favor of this middleware. Nest's body parser stays on: `better-call` re-reads an already parsed `req.body` (checked in 1.4.6).

The configuration does not read `process.env`: `better-auth.config.ts` exports `createAuth(prisma, props)`, and the `BETTER_AUTH` provider of `AuthenticationModule` calls it with the `PrismaService` and values from `ConfigService`.

## Git

Conventional Commits, checked by commitlint: `feat|fix|refactor|test|chore|docs|perf|build|ci|style|revert`. The subject is English, lowercase, imperative. The body is bullets explaining *why*. Commit only when asked.
