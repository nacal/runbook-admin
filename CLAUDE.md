# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**runbook-admin** - A local web GUI tool for executing and managing Runn runbooks via browser. Distributed as an NPX package for instant execution.

## Key Commands

```bash
# Development
pnpm run dev          # Start development server with HMR

# Building
pnpm run build        # Build production version
pnpm run preview      # Preview production build

# Testing
pnpm test             # Run all tests (184 tests)
pnpm test:run         # Run tests in CI mode
pnpm test:e2e:list    # Run E2E tests with list reporter

# Quality Checks
pnpm typecheck        # TypeScript type checking
pnpm check            # Biome linter check
pnpm agentcheck       # Complete CI pipeline (check + build + test + e2e)

# Production
pnpm run start        # Run production server
npx runbook-admin     # Execute directly via NPX
```

## Architecture

### Tech Stack

- **HonoX**: File-based routing full-stack framework
- **TypeScript**: Full type safety across the codebase
- **Vite**: Build tooling and HMR
- **Vitest**: Unit and integration testing framework
- **Playwright**: End-to-end testing
- **Biome**: Linting and formatting

### Core Structure (HonoX Best Practices)

```
app/
├── routes/          # File-based routing (API and pages)
├── islands/         # Interactive client components
├── components/      # Reusable UI components
├── services/        # Business logic layer
│   ├── runn.ts     # Runn CLI integration
│   ├── file-scanner.ts  # Runbook discovery
│   ├── execution-manager.ts # Execution state management
│   ├── favorites-manager.ts # Favorites handling
│   └── variable-manager.ts  # Variable presets
├── utils/           # Utility functions
│   └── storage.ts  # Local storage management
├── types/           # Type definitions
│   └── types.ts    # Shared type definitions
└── server.ts       # Server entry point

tests/
├── unit/            # Unit tests (services, utils)
├── integration/     # Integration tests (API endpoints)
└── e2e/             # End-to-end tests (Playwright)
```

### Key Patterns

1. **File-based routing**: Routes automatically mapped from `app/routes/`
2. **Islands Architecture**: Interactive components in `app/islands/`
3. **API endpoints**: Defined in `app/routes/api/`
4. **Runn execution**: Spawns Runn CLI process and streams output

## Development Guidelines

### Runbook Detection

- Patterns: `**/*.runbook.yml`, `**/runbooks/**/*.yml`, `**/tests/**/*.yml`, `**/*.runn.yml`
- Excludes: `node_modules/`, `.git/`, `dist/`, `build/`

### Server Configuration

- Port: 3000 (configurable via PORT env)
- Host: 127.0.0.1 (local only)
- Auto-opens browser after 1 second

### Dependencies

- Requires Runn CLI in PATH: `go install github.com/k1LoW/runn/cmd/runn@latest`
- Node.js 18+

### Type Safety

- All new code must have proper TypeScript types
- Shared types go in `app/types/types.ts`
- Use type imports: `import type { Runbook } from '../types/types'`

### Directory Organization (HonoX Best Practices)

- **routes/**: File-based routing for pages and APIs
- **islands/**: Interactive client-side components (Islands Architecture)
- **components/**: Reusable UI components (non-interactive)
- **services/**: Business logic and external service integrations
- **utils/**: Utility functions and helpers
- **types/**: TypeScript type definitions

## Testing Strategy

### Test Coverage
- **184 tests** total across unit, integration, and E2E
- **Unit tests**: Services and utilities with mocking
- **Integration tests**: API endpoints with real HTTP requests
- **E2E tests**: Browser automation across Chrome, Firefox, WebKit

### Test Requirements
- All tests must pass (184/184)
- TypeScript compilation must succeed
- Biome linting must pass (no errors/warnings)
- Build must complete successfully
- E2E tests must pass across all browsers

### Mock Strategy
- **Services**: Mock external dependencies (file system, child processes)
- **API tests**: Use real HonoX app instances
- **Time-sensitive tests**: Add appropriate tolerances for timing precision
- **Private method access**: Use helper functions instead of `any` casting

## Development Best Practices

### Code Quality Pipeline
1. Write/modify code with proper TypeScript types
2. Run `pnpm test` to ensure all tests pass (184/184)
3. Run `pnpm typecheck` to verify TypeScript compilation
4. Run `pnpm check` to verify Biome linting (no errors/warnings)
5. Run `pnpm agentcheck` for complete CI pipeline validation
6. **Never commit code with failing tests, type errors, or linting issues**

### Common Error Resolutions
- **Test timing issues**: Add small tolerances (±10ms) for timestamp comparisons in date-based tests
- **Mock problems**: Reset mocks in `beforeEach`, use `vi.resetModules()`, and ensure proper async/await
- **Type errors**: Use helper functions for private method access instead of complex type intersections
- **Biome warnings**: Use `// biome-ignore` comments with specific reasons for necessary exceptions
- **Singleton pattern testing**: Reset private instance fields using type assertions when needed

### Final Validation Requirements
- **All code changes must pass `pnpm agentcheck` before completion**
- This includes: type checking, linting, testing, building, and E2E validation  
- Current project status: 184/184 tests passing, all type/lint checks passing

### Core Service Architecture
- **RunnExecutor**: Main service for executing Runn runbooks with full event lifecycle
- **ExecutionOptionsManager**: Manages preset configurations and command argument building  
- **EnvironmentManager**: Handles environment variables with secret masking support
- **FavoritesManager**: Simple runbook favoriting with local storage persistence
- **FileScanner**: Discovers runbooks using configurable patterns and exclusions