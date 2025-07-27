import { vi } from 'vitest'
import { sampleRunbookYaml, simpleRunbookYaml } from '../fixtures/runbooks'

// Mock file system operations
export const mockFsPromises = {
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}

// Mock file stats
export const createMockStats = (isDirectory = false, mtime = new Date()) => ({
  isDirectory: () => isDirectory,
  isFile: () => !isDirectory,
  mtime,
})

// Mock directory entries
export const createMockDirEntry = (name: string, isDirectory = false) => ({
  name,
  isDirectory: () => isDirectory,
  isFile: () => !isDirectory,
})

// Sample file system structure for tests
export const mockFileSystem = {
  '/test/project': [
    createMockDirEntry('runbooks', true),
    createMockDirEntry('node_modules', true),
    createMockDirEntry('package.json', false),
  ],
  '/test/project/runbooks': [
    createMockDirEntry('sample.runbook.yml', false),
    createMockDirEntry('simple.runbook.yml', false),
    createMockDirEntry('invalid.yml', false),
    createMockDirEntry('subdir', true),
  ],
  '/test/project/runbooks/subdir': [
    createMockDirEntry('nested.runbook.yml', false),
  ],
}

export const mockFileContents = {
  '/test/project/runbooks/sample.runbook.yml': sampleRunbookYaml,
  '/test/project/runbooks/simple.runbook.yml': simpleRunbookYaml,
  '/test/project/runbooks/invalid.yml': 'invalid yaml content [}',
  '/test/project/runbooks/subdir/nested.runbook.yml': simpleRunbookYaml,
}

// Setup mock implementations
export const setupFsMocks = () => {
  mockFsPromises.readdir.mockImplementation(async (path: string) => {
    const entries = mockFileSystem[path as keyof typeof mockFileSystem]
    if (!entries) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`)
    }
    return entries
  })

  mockFsPromises.readFile.mockImplementation(async (path: string) => {
    const content = mockFileContents[path as keyof typeof mockFileContents]
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    }
    return content
  })

  mockFsPromises.stat.mockImplementation(async (path: string) => {
    if (path.endsWith('.yml') || path.endsWith('.yaml')) {
      return createMockStats(false, new Date('2024-01-01'))
    }
    if (Object.keys(mockFileSystem).includes(path)) {
      return createMockStats(true, new Date('2024-01-01'))
    }
    throw new Error(`ENOENT: no such file or directory, stat '${path}'`)
  })
}
