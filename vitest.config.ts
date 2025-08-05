import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    testTimeout: 10000, // 10秒に設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        'src/bin/',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
      ],
    },
    include: ['tests/**/*.test.{js,ts,tsx}'],
    exclude: ['tests/e2e/**'],
    server: {
      deps: {
        external: ['node:fs/promises', 'node:crypto', 'node:path'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './app'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
  define: {
    // HonoXでの__dirname問題を解決
    __dirname: JSON.stringify(__dirname),
  },
})
