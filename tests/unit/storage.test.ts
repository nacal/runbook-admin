import { beforeEach, describe, expect, it } from 'vitest'

// まず、シンプルなStorageテストから始めます
// Storage の static メソッドと基本動作をテストします

describe('Storage (Simple Tests)', () => {
  // 基本的なテストのみを実装し、ファイルI/Oをモックしない

  describe('Static Methods and Basic Functionality', () => {
    let Storage: typeof import('../../app/services/storage').Storage

    beforeEach(async () => {
      // Reset singleton
      const storageModule = await import('../../app/services/storage')
      Storage = storageModule.Storage
      const StorageWithPrivateAccess = Storage as unknown as {
        instance?: unknown
      }
      StorageWithPrivateAccess.instance = undefined
    })

    it('should implement singleton pattern', () => {
      const instance1 = Storage.getInstance()
      const instance2 = Storage.getInstance()

      expect(instance1).toBe(instance2)
      expect(instance1).toBeDefined()
    })

    it('should return storage path', () => {
      const storage = Storage.getInstance()
      const path = storage.getStoragePath()

      // テスト環境では .test-storage が使用される
      expect(path).toMatch(/\.(runbook-admin|test-storage)$/)
      expect(typeof path).toBe('string')
    })

    it('should have all required methods', () => {
      const storage = Storage.getInstance()

      // Check that all public methods exist
      expect(typeof storage.ensureStorageDir).toBe('function')
      expect(typeof storage.saveExecutionHistory).toBe('function')
      expect(typeof storage.loadExecutionHistory).toBe('function')
      expect(typeof storage.clearHistory).toBe('function')
      expect(typeof storage.saveFavorites).toBe('function')
      expect(typeof storage.loadFavorites).toBe('function')
      expect(typeof storage.saveVariablePresets).toBe('function')
      expect(typeof storage.loadVariablePresets).toBe('function')
      expect(typeof storage.saveGlobalVariables).toBe('function')
      expect(typeof storage.loadGlobalVariables).toBe('function')
      expect(typeof storage.saveEnvironmentVariables).toBe('function')
      expect(typeof storage.loadEnvironmentVariables).toBe('function')
      expect(typeof storage.saveExecutionPresets).toBe('function')
      expect(typeof storage.loadExecutionPresets).toBe('function')
      expect(typeof storage.saveDefaultExecutionOptions).toBe('function')
      expect(typeof storage.loadDefaultExecutionOptions).toBe('function')
      expect(typeof storage.saveSettings).toBe('function')
      expect(typeof storage.loadSettings).toBe('function')
      expect(typeof storage.getStoragePath).toBe('function')
    })

    it('should handle method calls without throwing (basic smoke test)', async () => {
      const storage = Storage.getInstance()

      // These should not throw even if they can't actually write/read files
      await expect(storage.loadExecutionHistory()).resolves.not.toThrow()
      await expect(storage.loadFavorites()).resolves.not.toThrow()
      await expect(storage.loadVariablePresets()).resolves.not.toThrow()
      await expect(storage.loadGlobalVariables()).resolves.not.toThrow()
      await expect(storage.loadEnvironmentVariables()).resolves.not.toThrow()
      await expect(storage.loadExecutionPresets()).resolves.not.toThrow()
      await expect(storage.loadDefaultExecutionOptions()).resolves.not.toThrow()
      await expect(storage.loadSettings()).resolves.not.toThrow()
    })

    it('should return appropriate default values for load methods', async () => {
      const storage = Storage.getInstance()

      // When files don't exist or have errors, should return sensible defaults
      const history = await storage.loadExecutionHistory()
      const favorites = await storage.loadFavorites()
      const presets = await storage.loadVariablePresets()
      const globalVars = await storage.loadGlobalVariables()
      const envVars = await storage.loadEnvironmentVariables()
      const execPresets = await storage.loadExecutionPresets()
      const options = await storage.loadDefaultExecutionOptions()
      const settings = await storage.loadSettings()

      expect(Array.isArray(history)).toBe(true)
      expect(Array.isArray(favorites)).toBe(true)
      expect(typeof presets).toBe('object')
      expect(typeof globalVars).toBe('object')
      expect(typeof envVars).toBe('object')
      expect(typeof execPresets).toBe('object')
      expect(typeof options).toBe('object')
      expect(typeof settings).toBe('object')

      // Should have expected default structure
      expect(options).toHaveProperty('args')
      expect(Array.isArray(options.args)).toBe(true)
    })

    it('should handle save operations gracefully', async () => {
      const storage = Storage.getInstance()

      // These should not throw even if they can't actually write files
      await expect(storage.saveExecutionHistory([])).resolves.not.toThrow()
      await expect(storage.saveFavorites([])).resolves.not.toThrow()
      await expect(storage.saveVariablePresets({})).resolves.not.toThrow()
      await expect(storage.saveGlobalVariables({})).resolves.not.toThrow()
      await expect(storage.saveEnvironmentVariables({})).resolves.not.toThrow()
      await expect(storage.saveExecutionPresets({})).resolves.not.toThrow()
      await expect(
        storage.saveDefaultExecutionOptions({ args: [] }),
      ).resolves.not.toThrow()
      await expect(storage.saveSettings({})).resolves.not.toThrow()
      await expect(storage.clearHistory()).resolves.not.toThrow()
    })
  })

  describe('Error Resilience', () => {
    let Storage: typeof import('../../app/services/storage').Storage

    beforeEach(async () => {
      const storageModule = await import('../../app/services/storage')
      Storage = storageModule.Storage
      const StorageWithPrivateAccess = Storage as unknown as {
        instance?: unknown
      }
      StorageWithPrivateAccess.instance = undefined
    })

    it('should handle concurrent access', () => {
      // Multiple getInstance calls should return same instance
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(Storage.getInstance()),
      )

      return Promise.all(promises).then((instances) => {
        const firstInstance = instances[0]
        instances.forEach((instance) => {
          expect(instance).toBe(firstInstance)
        })
      })
    })

    it('should handle reset and re-initialization', () => {
      const instance1 = Storage.getInstance()

      // Reset singleton
      const StorageWithPrivateAccess = Storage as unknown as {
        instance?: unknown
      }
      StorageWithPrivateAccess.instance = undefined

      const instance2 = Storage.getInstance()

      // Should be different instances after reset
      expect(instance1).not.toBe(instance2)

      // But getInstance should still work
      const instance3 = Storage.getInstance()
      expect(instance2).toBe(instance3)
    })
  })
})
