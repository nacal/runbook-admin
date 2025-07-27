import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionOptions } from '../../app/types/types'

// Simple ExecutionOptionsManager tests that focus on logic rather than file I/O
describe('ExecutionOptionsManager (Simple Tests)', () => {
  let ExecutionOptionsManager: typeof import('../../app/services/execution-options-manager').ExecutionOptionsManager
  let manager: InstanceType<
    typeof import('../../app/services/execution-options-manager').ExecutionOptionsManager
  >

  beforeEach(async () => {
    // Reset singleton
    const executionOptionsManagerModule = await import(
      '../../app/services/execution-options-manager'
    )
    ExecutionOptionsManager =
      executionOptionsManagerModule.ExecutionOptionsManager
    const ExecutionOptionsManagerWithPrivateAccess =
      ExecutionOptionsManager as unknown as {
        instance?: unknown
      }
    ExecutionOptionsManagerWithPrivateAccess.instance = undefined

    manager = ExecutionOptionsManager.getInstance()

    // Wait for potential initialization
    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = ExecutionOptionsManager.getInstance()
      const instance2 = ExecutionOptionsManager.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should handle concurrent access', () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(ExecutionOptionsManager.getInstance()),
      )

      return Promise.all(promises).then((instances) => {
        const firstInstance = instances[0]
        instances.forEach((instance) => {
          expect(instance).toBe(firstInstance)
        })
      })
    })
  })

  describe('preset management', () => {
    it('should save and retrieve presets', async () => {
      const presetName = 'test-preset'
      const options: ExecutionOptions = {
        failFast: true,
        skipTest: false,
        debug: true,
        args: ['--verbose', '--timeout=30s'],
      }
      const description = 'Test preset description'

      await manager.savePreset(presetName, options, description)

      const preset = await manager.getPreset(presetName)

      expect(preset).toBeDefined()
      expect(preset?.name).toBe(presetName)
      expect(preset?.description).toBe(description)
      expect(preset?.options).toEqual(options)
      expect(preset?.createdAt).toBeInstanceOf(Date)
      expect(preset?.lastUsed).toBeInstanceOf(Date)
    })

    it('should save preset without description', async () => {
      const presetName = 'simple-preset'
      const options: ExecutionOptions = {
        args: ['--simple'],
      }

      await manager.savePreset(presetName, options)

      const preset = await manager.getPreset(presetName)

      expect(preset).toBeDefined()
      expect(preset?.name).toBe(presetName)
      expect(preset?.description).toBeUndefined()
      expect(preset?.options).toEqual(options)
    })

    it('should update last used time when getting preset', async () => {
      const presetName = 'time-test'
      const options: ExecutionOptions = { args: ['--test'] }

      await manager.savePreset(presetName, options)

      const firstGet = await manager.getPreset(presetName)
      const firstLastUsed = firstGet?.lastUsed

      await new Promise((resolve) => setTimeout(resolve, 10))

      const secondGet = await manager.getPreset(presetName)
      const secondLastUsed = secondGet?.lastUsed

      expect(secondLastUsed?.getTime()).toBeGreaterThan(
        firstLastUsed?.getTime() || 0,
      )
    })

    it('should get all presets sorted by last used', async () => {
      // Create fresh instance to ensure clean state
      const ExecutionOptionsManagerWithPrivateAccess =
        ExecutionOptionsManager as unknown as {
          instance?: unknown
        }
      ExecutionOptionsManagerWithPrivateAccess.instance = undefined
      manager = ExecutionOptionsManager.getInstance()
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Save multiple presets
      await manager.savePreset('preset1', { args: ['--arg1'] })
      await new Promise((resolve) => setTimeout(resolve, 10))
      await manager.savePreset('preset2', { args: ['--arg2'] })
      await new Promise((resolve) => setTimeout(resolve, 10))
      await manager.savePreset('preset3', { args: ['--arg3'] })

      // Use preset2 to update its lastUsed time
      await new Promise((resolve) => setTimeout(resolve, 10))
      await manager.getPreset('preset2')

      const allPresets = await manager.getAllPresets()

      expect(allPresets.length).toBeGreaterThanOrEqual(3)

      // preset2 should be first (most recently used)
      const preset2Index = allPresets.findIndex((p) => p.name === 'preset2')
      expect(preset2Index).toBe(0)
    })

    it('should delete preset', async () => {
      const presetName = 'to-delete'
      await manager.savePreset(presetName, { args: ['--delete-me'] })

      // Verify it exists
      let preset = await manager.getPreset(presetName)
      expect(preset).toBeDefined()

      // Delete it
      const deleted = await manager.deletePreset(presetName)
      expect(deleted).toBe(true)

      // Verify it's gone
      preset = await manager.getPreset(presetName)
      expect(preset).toBeUndefined()
    })

    it('should return false when deleting non-existent preset', async () => {
      const deleted = await manager.deletePreset('non-existent')
      expect(deleted).toBe(false)
    })

    it('should return undefined for non-existent preset', async () => {
      const preset = await manager.getPreset('non-existent')
      expect(preset).toBeUndefined()
    })
  })

  describe('default options management', () => {
    it('should set and get default options', async () => {
      const options: ExecutionOptions = {
        failFast: true,
        skipTest: false,
        debug: true,
        args: ['--default', '--verbose'],
      }

      await manager.setDefaultOptions(options)

      const retrieved = await manager.getDefaultOptions()
      expect(retrieved).toEqual(options)
    })

    it('should return copy of default options (not reference)', async () => {
      const options: ExecutionOptions = {
        args: ['--test'],
      }

      await manager.setDefaultOptions(options)

      const retrieved1 = await manager.getDefaultOptions()
      const retrieved2 = await manager.getDefaultOptions()

      expect(retrieved1).toEqual(retrieved2)
      expect(retrieved1).not.toBe(retrieved2)

      // Modifying one should not affect the other
      retrieved1.args = ['--modified']
      const retrieved3 = await manager.getDefaultOptions()
      expect(retrieved3.args).not.toEqual(['--modified'])
    })

    it('should handle empty args in default options', async () => {
      const options: ExecutionOptions = {
        failFast: false,
        args: [],
      }

      await manager.setDefaultOptions(options)

      const retrieved = await manager.getDefaultOptions()
      expect(retrieved.args).toEqual([])
      expect(retrieved.failFast).toBe(false)
    })
  })

  describe('command arguments building', () => {
    it('should return args from execution options', () => {
      const options: ExecutionOptions = {
        args: ['--verbose', '--timeout=30s', '--parallel=4'],
      }

      const commandArgs = manager.buildCommandArgs(options)
      expect(commandArgs).toEqual([
        '--verbose',
        '--timeout=30s',
        '--parallel=4',
      ])
    })

    it('should handle empty args', () => {
      const options: ExecutionOptions = {
        args: [],
      }

      const commandArgs = manager.buildCommandArgs(options)
      expect(commandArgs).toEqual([])
    })

    it('should handle undefined args', () => {
      const options: ExecutionOptions = {
        failFast: true,
        // args is undefined
      }

      const commandArgs = manager.buildCommandArgs(options)
      expect(commandArgs).toEqual([])
    })

    it('should handle default empty options', () => {
      const commandArgs = manager.buildCommandArgs()
      expect(commandArgs).toEqual([])
    })

    it('should handle complex command arguments', () => {
      const options: ExecutionOptions = {
        args: [
          '--config=test.config.yaml',
          '--env=staging',
          '--retry=3',
          '--output-format=json',
          '--include-pattern=*.spec.yaml',
        ],
      }

      const commandArgs = manager.buildCommandArgs(options)
      expect(commandArgs).toEqual([
        '--config=test.config.yaml',
        '--env=staging',
        '--retry=3',
        '--output-format=json',
        '--include-pattern=*.spec.yaml',
      ])
    })

    it('should preserve argument order', () => {
      const options: ExecutionOptions = {
        args: ['--first', '--second', '--third'],
      }

      const commandArgs = manager.buildCommandArgs(options)
      expect(commandArgs[0]).toBe('--first')
      expect(commandArgs[1]).toBe('--second')
      expect(commandArgs[2]).toBe('--third')
    })
  })

  describe('execution options validation', () => {
    it('should handle all option flags', async () => {
      const options: ExecutionOptions = {
        failFast: true,
        skipTest: true,
        debug: true,
        args: ['--custom'],
      }

      await manager.savePreset('all-flags', options)
      const preset = await manager.getPreset('all-flags')

      expect(preset?.options.failFast).toBe(true)
      expect(preset?.options.skipTest).toBe(true)
      expect(preset?.options.debug).toBe(true)
      expect(preset?.options.args).toEqual(['--custom'])
    })

    it('should handle false boolean values', async () => {
      const options: ExecutionOptions = {
        failFast: false,
        skipTest: false,
        debug: false,
        args: [],
      }

      await manager.savePreset('all-false', options)
      const preset = await manager.getPreset('all-false')

      expect(preset?.options.failFast).toBe(false)
      expect(preset?.options.skipTest).toBe(false)
      expect(preset?.options.debug).toBe(false)
    })

    it('should handle partial options', async () => {
      const options: ExecutionOptions = {
        failFast: true,
        // skipTest and debug are undefined
        args: ['--partial'],
      }

      await manager.savePreset('partial', options)
      const preset = await manager.getPreset('partial')

      expect(preset?.options.failFast).toBe(true)
      expect(preset?.options.skipTest).toBeUndefined()
      expect(preset?.options.debug).toBeUndefined()
      expect(preset?.options.args).toEqual(['--partial'])
    })
  })

  describe('data consistency', () => {
    it('should maintain consistent timestamps', async () => {
      const presetName = 'timestamp-test'
      const options: ExecutionOptions = { args: ['--test'] }

      const beforeTime = new Date()
      await manager.savePreset(presetName, options)
      const afterTime = new Date()

      const preset = await manager.getPreset(presetName)

      expect(preset?.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      )
      expect(preset?.createdAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      )
      expect(preset?.lastUsed?.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      )
      expect(preset?.lastUsed?.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      )
    })

    it('should handle special characters in preset names', async () => {
      const specialNames = [
        'preset-with-dashes',
        'preset_with_underscores',
        'preset.with.dots',
        'preset with spaces',
        'preset@#$%',
      ]

      for (const name of specialNames) {
        const options: ExecutionOptions = { args: [`--${name}`] }
        await expect(manager.savePreset(name, options)).resolves.not.toThrow()

        const preset = await manager.getPreset(name)
        expect(preset?.name).toBe(name)
        expect(preset?.options.args).toEqual([`--${name}`])
      }
    })

    it('should handle empty and whitespace in arguments', async () => {
      const options: ExecutionOptions = {
        args: ['', ' ', '\t', '\n', '   multiple   spaces   '],
      }

      await manager.savePreset('whitespace-test', options)
      const preset = await manager.getPreset('whitespace-test')

      expect(preset?.options.args).toEqual([
        '',
        ' ',
        '\t',
        '\n',
        '   multiple   spaces   ',
      ])
    })
  })

  describe('method availability', () => {
    it('should have all required public methods', () => {
      expect(typeof manager.savePreset).toBe('function')
      expect(typeof manager.getPreset).toBe('function')
      expect(typeof manager.getAllPresets).toBe('function')
      expect(typeof manager.deletePreset).toBe('function')
      expect(typeof manager.setDefaultOptions).toBe('function')
      expect(typeof manager.getDefaultOptions).toBe('function')
      expect(typeof manager.buildCommandArgs).toBe('function')
    })

    it('should handle method calls gracefully', async () => {
      // These should not throw
      await expect(manager.getAllPresets()).resolves.not.toThrow()
      await expect(manager.getDefaultOptions()).resolves.not.toThrow()
      await expect(manager.getPreset('test')).resolves.not.toThrow()
      await expect(manager.deletePreset('test')).resolves.not.toThrow()

      expect(() => manager.buildCommandArgs()).not.toThrow()
      expect(() => manager.buildCommandArgs({})).not.toThrow()
    })

    it('should return appropriate types', async () => {
      const allPresets = await manager.getAllPresets()
      const defaultOptions = await manager.getDefaultOptions()
      const preset = await manager.getPreset('test')
      const deleteResult = await manager.deletePreset('test')
      const commandArgs = manager.buildCommandArgs()

      expect(Array.isArray(allPresets)).toBe(true)
      expect(typeof defaultOptions).toBe('object')
      expect(defaultOptions).toHaveProperty('args')
      expect(Array.isArray(defaultOptions.args)).toBe(true)
      expect(preset === undefined || typeof preset === 'object').toBe(true)
      expect(typeof deleteResult).toBe('boolean')
      expect(Array.isArray(commandArgs)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty preset name', async () => {
      const emptyName = ''
      const options: ExecutionOptions = { args: ['--test'] }

      await expect(
        manager.savePreset(emptyName, options),
      ).resolves.not.toThrow()
      await expect(manager.getPreset(emptyName)).resolves.not.toThrow()
    })

    it('should handle very long preset names', async () => {
      const longName = 'a'.repeat(1000)
      const options: ExecutionOptions = { args: ['--long'] }

      await expect(manager.savePreset(longName, options)).resolves.not.toThrow()
      const preset = await manager.getPreset(longName)
      expect(preset?.name).toBe(longName)
    })

    it('should handle very long argument lists', async () => {
      const manyArgs = Array.from({ length: 100 }, (_, i) => `--arg${i}`)
      const options: ExecutionOptions = { args: manyArgs }

      await manager.savePreset('many-args', options)
      const preset = await manager.getPreset('many-args')

      expect(preset?.options.args).toHaveLength(100)
      expect(preset?.options.args).toEqual(manyArgs)
    })
  })
})
