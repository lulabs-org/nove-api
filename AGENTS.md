# Repository Guidelines

## Project Structure & Module Organization

This NestJS 11/TypeScript API uses Prisma with PostgreSQL and Redis/BullMQ. Group features under `src/` by domain, such as `auth/`, `meeting/`, `order/`, and `drive/`. Keep controllers, services, repositories, DTOs, and module definitions within their domain. Shared utilities and infrastructure live in `src/common/`, `src/configs/`, and `src/prisma/`.

Prisma schemas, migrations, and seeds belong in `prisma/`; shared test fixtures and helpers in `test/`; documentation in `docs/`; maintenance tools in `scripts/`. Treat `dist/` and `coverage/` as generated output.

## Build, Test, and Development Commands

Use Node.js 22.12+ (CI uses 22.23.1) and pnpm 9.15.9 to match CI.

- `pnpm install --frozen-lockfile`: install locked dependencies.
- `pnpm start:dev`: start the API with watch mode.
- `pnpm build`: compile the application into `dist/`.
- `pnpm lint` / `pnpm lint:prisma`: lint and auto-fix application/test or Prisma TypeScript.
- `pnpm format`: format source, tests, and Prisma TypeScript with Prettier.
- `pnpm db:generate`: regenerate the Prisma client.
- `pnpm db:migrate`: create/apply development migrations.
- `pnpm exec prisma validate`: validate the Prisma schema.
- `pnpm docs:dev`: serve the documentation locally.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes, and trailing commas. Follow Prettier and the type-aware ESLint configuration. Use kebab-case filenames, PascalCase classes, and camelCase functions and variables. Retain role suffixes such as `.service.ts`, `.controller.ts`, and `.dto.ts`. Prefer `@/` imports for paths rooted at `src/`.

## Testing Guidelines

Tests use Jest, ts-jest, and Supertest. Place unit tests in `src/**/*.spec.ts` or `test/unit/**/*.spec.ts`; integration tests in `test/integration/**/*.int-spec.ts`; end-to-end tests in `test/e2e/**/*.e2e-spec.ts`.

Run `pnpm exec jest --selectProjects unit --runInBand` for serial unit tests. Use `pnpm test:integration` or `pnpm test:e2e` for broader checks and `pnpm test:ci` for all configured projects with coverage. Unit coverage thresholds are configured at 80% for branches, functions, lines, and statements. Current CI runs unit tests. Add focused regression tests for behavior changes; use isolated test databases.

## Commit & Pull Request Guidelines

Follow Conventional Commits, e.g., `fix(role): guard member removal`. Keep commits scoped; include migrations with schema changes. PRs should explain behavior, link relevant issues, document configuration/database changes, and report validation. Run build, lint, relevant tests, and Prisma validation when applicable before review.

## Security & Configuration

Copy `.env.example` to `.env` for local configuration; document new keys in the example. Never commit credentials or log tokens. Review migration and seed effects before running them against shared databases.
