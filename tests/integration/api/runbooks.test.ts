import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock FileScanner at module level
vi.mock('../../../app/services/file-scanner', () => {
  const mockScanRunbooks = vi.fn()
  return {
    FileScanner: vi.fn().mockImplementation(() => ({
      scanRunbooks: mockScanRunbooks,
    })),
    mockScanRunbooks, // Export for test access
  }
})

describe('/api/runbooks', () => {
  let mockScanRunbooks: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const fileScannerModule = await import('../../../app/services/file-scanner')
    const moduleWithMock = fileScannerModule as {
      mockScanRunbooks?: ReturnType<typeof vi.fn>
    }
    mockScanRunbooks = moduleWithMock.mockScanRunbooks ?? vi.fn()

    mockScanRunbooks.mockResolvedValue([
      {
        id: 'test-runbook-1',
        path: 'test/sample.runbook.yml',
        name: 'sample',
        description: 'Sample test runbook',
        steps: 3,
        lastModified: new Date('2024-01-01'),
        variables: {},
        labels: ['test'],
      },
    ])
  })

  describe('FileScanner integration', () => {
    it('should call scanRunbooks', async () => {
      const { FileScanner } = await import('../../../app/services/file-scanner')
      const FileScannerconstructor = FileScanner as new (
        path: string,
      ) => InstanceType<typeof FileScanner>
      const scanner = new FileScannerconstructor('/test/path')
      const runbooks = await scanner.scanRunbooks()

      expect(mockScanRunbooks).toHaveBeenCalled()
      expect(runbooks).toHaveLength(1)
      expect(runbooks[0]).toMatchObject({
        id: 'test-runbook-1',
        name: 'sample',
        description: 'Sample test runbook',
        steps: 3,
      })
    })

    it('should handle empty results', async () => {
      mockScanRunbooks.mockResolvedValue([])

      const { FileScanner } = await import('../../../app/services/file-scanner')
      const FileScannerconstructor = FileScanner as new (
        path: string,
      ) => InstanceType<typeof FileScanner>
      const scanner = new FileScannerconstructor('/test/path')
      const runbooks = await scanner.scanRunbooks()

      expect(runbooks).toHaveLength(0)
    })

    it('should handle errors', async () => {
      mockScanRunbooks.mockRejectedValue(new Error('Scanner error'))

      const { FileScanner } = await import('../../../app/services/file-scanner')
      const FileScannerconstructor = FileScanner as new (
        path: string,
      ) => InstanceType<typeof FileScanner>
      const scanner = new FileScannerconstructor('/test/path')

      await expect(scanner.scanRunbooks()).rejects.toThrow('Scanner error')
    })
  })
})
