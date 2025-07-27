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

# Testing/Running
pnpm run start        # Run production server
npx runbook-admin    # Execute directly via NPX
```

## Architecture

### Tech Stack

- **HonoX**: File-based routing full-stack framework
- **TypeScript**: Full type safety across the codebase
- **Vite**: Build tooling and HMR

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

## Development Best Practices

- コード差分を加えた後は、pnpm agentcheckをpassすることまで確認する