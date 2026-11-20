import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [
    // NestJS depende de `emitDecoratorMetadata`, que o esbuild (transformador
    // padrão do Vitest) não suporta. O SWC cobre isso.
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  resolve: {
    alias: { '@': srcPath },
  },
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./src/shared/tests/setup.ts'],
    // Equivale a chamar vi.clearAllMocks() no beforeEach de todos os arquivos.
    clearMocks: true,
    // Os testes ficam dentro de cada módulo (src/<área>/tests/), como no
    // monólito modular do Grzybek. `--project unit` roda sem Docker.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/tests/unit/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/tests/integration/**/*.spec.ts'],
          // Sobe o Postgres descartável e aplica as migrations antes de qualquer spec.
          globalSetup: ['./src/shared/tests/integration/setup/global-setup.ts'],
          // Os specs dividem o mesmo banco: em paralelo, o TRUNCATE de um apagaria os dados do outro.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        // Specs, fakes, builders e setup de teste não contam.
        'src/**/tests/**',
        // Código gerado pelo Prisma, não escrito por nós.
        'src/generated/**',
        // Módulos e contratos são só declaração: wiring de DI, tipos e
        // interfaces, sem ramo de execução para exercitar.
        'src/**/*.module.ts',
        'src/**/*.interface.ts',
        'src/**/index.ts',
        // Bootstrap da aplicação: coberto por e2e subindo o processo.
        'src/main/main.ts',
      ],
      // Piso da cobertura somada dos dois projetos, para ela não regredir sem aviso.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
