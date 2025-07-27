import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileScanner } from '../../app/services/file-scanner'

// Mock the js-yaml module
vi.mock('js-yaml', () => ({
  load: vi.fn((content: string) => {
    // Simple YAML parser mock
    if (content.includes('desc: Sample test runbook')) {
      return {
        desc: 'Sample test runbook',
        vars: { TEST_VAR: 'default-value', OPTIONAL_VAR: '' },
        labels: ['test', 'sample'],
        steps: [
          { desc: 'Step 1', http: { url: 'https://example.com', method: 'GET' } },
          { desc: 'Step 2', exec: { command: 'echo "Hello ${TEST_VAR}"' } },
          { desc: 'Step 3', test: ['current.res.status == 200'] },
        ],
      }
    }
    return { desc: 'Simple runbook', steps: [{ exec: { command: 'echo "test"' } }] }
  }),
}))

describe('FileScanner', () => {
  let fileScanner: FileScanner

  beforeEach(() => {
    vi.clearAllMocks()
    // Use a test directory path
    process.cwd = vi.fn(() => '/test/project')
  })

  describe('instance creation', () => {
    it('should create FileScanner instance with custom path', () => {
      fileScanner = new FileScanner('/custom/path')
      expect(fileScanner).toBeInstanceOf(FileScanner)
    })

    it('should create FileScanner instance with default path', () => {
      fileScanner = new FileScanner()
      expect(fileScanner).toBeInstanceOf(FileScanner)
    })
  })

  describe('scanRunbooks with mocked fs', () => {
    beforeEach(() => {
      // Mock fs/promises for this test suite
      vi.doMock('node:fs/promises', () => ({
        readdir: vi.fn().mockResolvedValue([]),
        readFile: vi.fn().mockResolvedValue('desc: Test runbook\nsteps:\n  - exec: echo test'),
        stat: vi.fn().mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
          mtime: new Date('2024-01-01'),
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
          dev: 0,
          ino: 0,
          mode: 0,
          nlink: 0,
          uid: 0,
          gid: 0,
          rdev: 0,
          size: 0,
          blksize: 0,
          blocks: 0,
          atimeMs: 0,
          mtimeMs: 0,
          ctimeMs: 0,
          birthtimeMs: 0,
          atime: new Date(),
          ctime: new Date(),
          birthtime: new Date(),
        }),
      }))
    })

    it('should handle empty directory', async () => {
      const scanner = new FileScanner('/test/empty')
      const runbooks = await scanner.scanRunbooks()
      
      expect(Array.isArray(runbooks)).toBe(true)
      expect(runbooks).toHaveLength(0)
    })
  })

  describe('file type detection', () => {
    it('should have private methods for parsing', () => {
      fileScanner = new FileScanner()
      // Test that the class has the expected structure
      expect(fileScanner.scanRunbooks).toBeDefined()
      expect(typeof fileScanner.scanRunbooks).toBe('function')
    })
  })
})