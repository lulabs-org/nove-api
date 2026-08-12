# Repository Guidelines

## Project Structure & Module Organization

Keep NestJS features grouped by domain under `src/`, such as `src/auth`, `src/meeting`, and `src/org-member`. Co-locate controllers, services, DTOs, guards, and module definitions within each domain. Shared infrastructure belongs in `src/common`, `src/configs`, `src/prisma`, or another clearly scoped shared module. Prisma schemas, migrations, and deterministic seeds live in `prisma/`. Put test fixtures and cross-module suites in `test/`, documentation in `docs/`, and maintenance tooling in `scripts/`. Treat `dist/` and `coverage/` as generated output.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies.
- `pnpm start:dev`: run the API in watch mode.
- `pnpm build`: compile the Nest application into `dist/`.
- `pnpm lint` and `pnpm lint:prisma`: lint and auto-fix application and Prisma TypeScript.
- `pnpm format`: format source, test, and Prisma files with Prettier.
- `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, and `pnpm test:system`: run suites by level.
- `pnpm test:ci`: run all Jest projects with coverage.
- `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed`: regenerate Prisma, apply development migrations, and seed data.

## Coding Style & Naming Conventions

Use TypeScript with 2-space indentation, single quotes, and trailing commas. Follow ESLint and Prettier rather than hand-formatting. Name files in kebab-case, classes and interfaces in PascalCase, and functions and variables in camelCase. Use explicit suffixes such as `.dto.ts`, `.guard.ts`, and `.service.ts`. Prefer `@/` for imports rooted at `src/` and `@common/` for shared utilities.

## Testing Guidelines

Jest with `ts-jest` powers all suites. Name unit tests `src/**/*.spec.ts` or `test/unit/**/*.spec.ts`, integration tests `*.int-spec.ts`, and end-to-end tests `*.e2e-spec.ts`. Unit coverage must remain at least 80% for branches, functions, lines, and statements. Add focused tests with every behavior change and run `pnpm test:ci` before significant merges.

## Commit & Pull Request Guidelines

Follow the repository's Conventional Commit pattern, for example `fix(permission): restrict API key scope` or `feat(org-member): add leader support`. Keep each commit scoped and include migrations with schema changes. Pull requests should explain behavior and risk, link relevant issues, note `.env` or database changes, and include API snapshots or test evidence when useful. Confirm build, lint, targeted tests, and required Prisma steps before requesting review.

## Security & Configuration

Never commit credentials. Derive local configuration from `.env.example`, document new keys, and avoid logging tokens or personal data. Review migrations and seeds for deterministic, non-production-safe defaults.
