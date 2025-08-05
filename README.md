# Runbook Admin

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/HonoX-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="HonoX">
  <img src="https://img.shields.io/badge/Runn-007ACC?style=for-the-badge&logo=github&logoColor=white" alt="Runn">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
</p>

![demo](demo.gif)

A local web GUI tool for executing and managing [Runn](https://github.com/k1LoW/runn) runbooks via browser. Distributed as an NPX package for instant execution.

**Runbook Admin** makes it easy to discover, execute, and manage Runn runbooks in your project with a beautiful web interface. Built with modern web technologies for a seamless developer experience.

## ✨ Key Features

- **🔍 Auto-discovery**: Automatically scans for runbooks using configurable patterns
- **🎨 Beautiful Web UI**: Modern, responsive interface with GitHub-like dark theme
- **⚡ Real-time execution**: Live output streaming with syntax highlighting
- **📊 Execution history**: Track results, timing, and execution status
- **🔧 Variable management**: Environment variables with secret masking support
- **❤️ Favorites system**: Bookmark frequently used runbooks
- **📋 Preset configurations**: Save and reuse execution options
- **🚀 NPX ready**: No installation required - run instantly via NPX

## 🚀 Quick Start

```bash
# Run in any project directory with runbooks
npx runbook-admin

# Browser opens automatically at http://localhost:3444
# Automatically scans for runbooks and displays them
```

## 📋 Requirements

- **Node.js** 18+ 
- **Runn CLI** installed and in PATH:
  ```bash
  go install github.com/k1LoW/runn/cmd/runn@latest
  ```

## 🔍 Runbook Detection

Automatically scans for runbooks by:

1. **File extension**: Searches for all `.yml` and `.yaml` files
2. **Content validation**: Checks if files contain `steps`, `desc`, or `description` fields
3. **Smart filtering**: Excludes non-runbook YAML files (config files, etc.)

**Supported runbook formats:**
- Standard runn runbooks with `steps:` section
- Runbooks with description-only (for documentation)
- Any YAML file with valid runbook structure

## 🛠️ Development

```bash
# Clone and install dependencies
git clone <repository>
cd runbook-admin
pnpm install

# Development server with hot reload
pnpm run dev

# Production build
pnpm run build

# Start production server
pnpm run start

# Testing
pnpm test              # Unit tests (184 tests)
pnpm test:run          # CI mode tests
pnpm test:e2e:list     # E2E tests

# Quality checks
pnpm typecheck         # TypeScript validation
pnpm check             # Biome linting
pnpm agentcheck        # Complete CI pipeline
```

## 🏗️ Architecture

### Tech Stack

- **[HonoX](https://github.com/honojs/honox)**: File-based routing full-stack framework
- **TypeScript**: Full type safety across the codebase
- **Vite**: Build tooling with hot module replacement
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **Biome**: Fast linter and formatter

### Project Structure

```
runbook-admin/
├── app/                    # HonoX application
│   ├── routes/            # File-based routing (API + pages)
│   ├── islands/           # Interactive client components
│   ├── components/        # Reusable UI components  
│   ├── services/          # Business logic layer
│   │   ├── runn.ts       # Runn CLI integration
│   │   ├── file-scanner.ts # Runbook discovery
│   │   └── *-manager.ts  # State management services
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript definitions
├── src/bin/               # CLI entry point
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # API integration tests
│   └── e2e/              # End-to-end tests
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript types
4. Add tests for new functionality
5. Ensure all tests pass: `pnpm agentcheck`
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

- Follow existing code patterns and conventions
- Maintain 100% TypeScript coverage
- Add comprehensive tests for new features
- Use Biome for linting and formatting
- Ensure `pnpm agentcheck` passes before submitting

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using [HonoX](https://github.com/honojs/honox) + [Runn](https://github.com/k1LoW/runn)**
