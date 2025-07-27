# 🔥 Runbook Admin

Local GUI for running and managing [Runn](https://github.com/k1LoW/runn) runbooks.

## ✨ Features

- **🔍 Auto-detect** runbooks in your project
- **🎨 Beautiful UI** for executing runbooks
- **⚡ Real-time** execution monitoring
- **📊 Execution history** and results
- **🔧 Variable management** with form inputs

## 🚀 Quick Start

```bash
# Run in any project directory
npx runbook-admin

# Browser opens automatically at http://localhost:3000
# Scans for *.yml files in common locations
```

## 📋 Requirements

- **Node.js** 18+ 
- **Runn CLI** installed and in PATH
  ```bash
  go install github.com/k1LoW/runn/cmd/runn@latest
  ```

## 🔍 Runbook Detection

Automatically scans for:
- `**/*.runbook.yml`
- `**/runbooks/**/*.yml` 
- `**/tests/**/*.yml`
- `**/*.runn.yml`

Ignores:
- `node_modules/`
- `.git/`
- `dist/`, `build/`

## 🛠 Development

```bash
# Clone and install
git clone <repo>
cd runbook-admin
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Run built version
npm run start

# Run tests
npm run test          # Unit tests
npm run test:coverage # Coverage report  
npm run test:e2e      # E2E tests
```

## 📁 Project Structure

```
runbook-admin/
├── app/                    # HonoX application
│   ├── routes/            # File-based routing
│   ├── islands/           # Interactive components
│   └── lib/               # Core utilities
├── src/bin/               # CLI entry point
└── package.json
```

## 🎯 Usage Examples

### Basic Runbook
```yaml
# tests/api-test.yml
desc: Test API endpoints
vars:
  API_BASE: http://localhost:8080
steps:
  - req:
      {{ vars.API_BASE }}/health:
        get: null
        test: current.res.status == 200
```

### With Environment Variables
```yaml
# runbooks/deploy.yml
desc: Deploy application
vars:
  environment: ${DEPLOY_ENV:-staging}
steps:
  - req:
      https://{{ vars.environment }}.example.com/deploy:
        post:
          headers:
            Authorization: Bearer ${API_TOKEN}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Add tests if needed
5. Submit pull request

## 📄 License

MIT - see [LICENSE](LICENSE) file.

---

**Built with [HonoX](https://github.com/honojs/honox) + [Runn](https://github.com/k1LoW/runn)** 🔥