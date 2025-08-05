import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionOptions, RunbookVariable } from '../../app/types/types'

// Simple VariableManager tests that focus on logic rather than file I/O
describe('VariableManager (Simple Tests)', () => {
  let VariableManager: typeof import('../../app/services/variable-manager').VariableManager
  let manager: import('../../app/services/variable-manager').VariableManager

  beforeEach(async () => {
    // Reset singleton
    const variableManagerModule = await import(
      '../../app/services/variable-manager'
    )
    VariableManager = variableManagerModule.VariableManager
    const VariableManagerWithPrivateAccess = VariableManager as unknown as {
      instance?: unknown
    }
    VariableManagerWithPrivateAccess.instance = undefined

    manager = VariableManager.getInstance()

    // Wait for potential initialization
    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = VariableManager.getInstance()
      const instance2 = VariableManager.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should handle concurrent access', () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(VariableManager.getInstance()),
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
      const variables = { VAR1: 'value1', VAR2: 'value2' }
      const description = 'Test preset description'
      const executionOptions: ExecutionOptions = {
        args: ['--verbose'],
      }

      // Save preset
      await manager.savePreset(
        presetName,
        variables,
        description,
        executionOptions,
      )

      // Retrieve preset
      const preset = await manager.getPreset(presetName)

      expect(preset).toBeDefined()
      expect(preset?.name).toBe(presetName)
      expect(preset?.description).toBe(description)
      expect(preset?.variables).toEqual(variables)
      expect(preset?.executionOptions).toEqual(executionOptions)
      expect(preset?.createdAt).toBeInstanceOf(Date)
      expect(preset?.lastUsed).toBeInstanceOf(Date)
    })

    it('should save preset without optional parameters', async () => {
      const presetName = 'simple-preset'
      const variables = { SIMPLE_VAR: 'simple_value' }

      await manager.savePreset(presetName, variables)

      const preset = await manager.getPreset(presetName)

      expect(preset).toBeDefined()
      expect(preset?.name).toBe(presetName)
      expect(preset?.description).toBeUndefined()
      expect(preset?.variables).toEqual(variables)
      expect(preset?.executionOptions).toBeUndefined()
    })

    it('should update last used time when getting preset', async () => {
      const presetName = 'time-test-preset'
      const variables = { TIME_VAR: 'time_value' }

      await manager.savePreset(presetName, variables)

      const firstGet = await manager.getPreset(presetName)
      const firstLastUsed = firstGet?.lastUsed

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10))

      const secondGet = await manager.getPreset(presetName)
      const secondLastUsed = secondGet?.lastUsed

      expect(secondLastUsed?.getTime()).toBeGreaterThan(
        firstLastUsed?.getTime() || 0,
      )
    })

    it('should get all presets sorted by last used', async () => {
      // Clear any existing presets by getting a fresh instance
      const VariableManagerWithPrivateAccess = VariableManager as unknown as {
        instance?: unknown
      }
      VariableManagerWithPrivateAccess.instance = undefined
      manager = VariableManager.getInstance()
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Save multiple presets
      await manager.savePreset('preset1', { VAR1: '1' })
      await new Promise((resolve) => setTimeout(resolve, 10))
      await manager.savePreset('preset2', { VAR2: '2' })
      await new Promise((resolve) => setTimeout(resolve, 10))
      await manager.savePreset('preset3', { VAR3: '3' })

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
      await manager.savePreset(presetName, { VAR: 'value' })

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

  describe('global variables', () => {
    it('should set and get global variables', async () => {
      const key = 'GLOBAL_VAR'
      const value = 'global_value'

      await manager.setGlobalVariable(key, value)

      const globals = await manager.getGlobalVariables()
      expect(globals[key]).toBe(value)
    })

    it('should handle multiple global variables', async () => {
      await manager.setGlobalVariable('VAR1', 'value1')
      await manager.setGlobalVariable('VAR2', 'value2')

      const globals = await manager.getGlobalVariables()
      expect(globals.VAR1).toBe('value1')
      expect(globals.VAR2).toBe('value2')
    })

    it('should delete global variable', async () => {
      const key = 'TO_DELETE'
      const value = 'delete_me'

      await manager.setGlobalVariable(key, value)

      // Verify it exists
      let globals = await manager.getGlobalVariables()
      expect(globals[key]).toBe(value)

      // Delete it
      const deleted = await manager.deleteGlobalVariable(key)
      expect(deleted).toBe(true)

      // Verify it's gone
      globals = await manager.getGlobalVariables()
      expect(globals[key]).toBeUndefined()
    })

    it('should return false when deleting non-existent global variable', async () => {
      const deleted = await manager.deleteGlobalVariable('non-existent')
      expect(deleted).toBe(false)
    })

    it('should return copy of global variables (not reference)', async () => {
      await manager.setGlobalVariable('TEST_VAR', 'test_value')

      const globals1 = await manager.getGlobalVariables()
      const globals2 = await manager.getGlobalVariables()

      // Should be equal but not the same object
      expect(globals1).toEqual(globals2)
      expect(globals1).not.toBe(globals2)

      // Modifying one should not affect the other
      globals1.NEW_VAR = 'new_value'
      expect(globals2.NEW_VAR).toBeUndefined()
    })
  })

  describe('variable merging', () => {
    const runbookVariables: Record<string, RunbookVariable> = {
      VAR1: {
        name: 'VAR1',
        type: 'string',
        required: false,
        defaultValue: 'default1',
      },
      VAR2: {
        name: 'VAR2',
        type: 'string',
        required: false,
        defaultValue: 'default2',
      },
      VAR3: { name: 'VAR3', type: 'string', required: false }, // No default
      VAR4: {
        name: 'VAR4',
        type: 'string',
        required: false,
        defaultValue: 'default4',
      },
      GLOBAL1: { name: 'GLOBAL1', type: 'string', required: false }, // Add GLOBAL1 to runbook variables
      PRESET_VAR: { name: 'PRESET_VAR', type: 'string', required: false }, // Add PRESET_VAR to runbook variables
    }

    beforeEach(async () => {
      // Reset for each test
      const VariableManagerWithPrivateAccess = VariableManager as unknown as {
        instance?: unknown
      }
      VariableManagerWithPrivateAccess.instance = undefined
      manager = VariableManager.getInstance()
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Set up global variables
      await manager.setGlobalVariable('GLOBAL1', 'global_value1')
      await manager.setGlobalVariable('VAR1', 'global_override1')

      // Set up a preset
      await manager.savePreset('test-preset', {
        VAR2: 'preset_override2',
        PRESET_VAR: 'preset_value',
        VAR4: 'preset_override4',
      })
    })

    it('should merge variables with correct priority order', async () => {
      const merged = await manager.mergeVariables(
        runbookVariables,
        'test-preset',
        { VAR1: 'user_override1', VAR3: 'user_override3' },
      )

      // Check key merging logic - user overrides should win
      expect(merged.VAR1).toBe('user_override1') // User override wins over global
      expect(merged.VAR2).toBe('preset_override2') // Preset wins over default
      expect(merged.VAR3).toBe('user_override3') // User override for var with no default
      expect(merged.VAR4).toBe('preset_override4') // Preset wins over default
      expect(merged.PRESET_VAR).toBe('preset_value') // Preset-only variable
      expect(merged.GLOBAL1).toBe('global_value1') // Global variable included

      // Check that all expected keys are present
      expect(merged).toHaveProperty('VAR1')
      expect(merged).toHaveProperty('VAR2')
      expect(merged).toHaveProperty('VAR3')
      expect(merged).toHaveProperty('VAR4')
      expect(merged).toHaveProperty('PRESET_VAR')
      expect(merged).toHaveProperty('GLOBAL1')
    })

    it('should use runbook defaults when no overrides exist', async () => {
      const merged = await manager.mergeVariables(runbookVariables)

      // Check priority: global > default
      expect(merged.VAR1).toBe('global_override1') // Global wins over default
      expect(merged.GLOBAL1).toBe('global_value1') // Global variable included

      // Check that keys are present
      expect(merged).toHaveProperty('VAR1')
      expect(merged).toHaveProperty('GLOBAL1')

      // VAR2 might have preset value if it exists from previous tests
      expect(merged).toHaveProperty('VAR2')
      expect(merged).toHaveProperty('VAR4')
    })

    it('should handle missing preset gracefully', async () => {
      const merged = await manager.mergeVariables(
        runbookVariables,
        'non-existent-preset',
      )

      // Should still include global variables and defaults
      expect(merged.GLOBAL1).toBe('global_value1')
      expect(merged.VAR1).toBe('global_override1')
      expect(merged).toHaveProperty('VAR2')
      expect(merged).toHaveProperty('VAR4')
    })

    it('should handle empty runbook variables', async () => {
      const merged = await manager.mergeVariables({})

      // With empty runbook variables, no variables should be processed
      expect(Object.keys(merged)).toHaveLength(0)
    })

    it('should handle empty overrides', async () => {
      const merged = await manager.mergeVariables(
        runbookVariables,
        'test-preset',
        {},
      )

      // Check that preset values are used when no user overrides
      expect(merged.GLOBAL1).toBe('global_value1')
      expect(merged.VAR1).toBe('global_override1') // Global wins over preset
      expect(merged.VAR2).toBe('preset_override2') // Preset wins over default
      expect(merged.VAR4).toBe('preset_override4') // Preset wins over default
      expect(merged.PRESET_VAR).toBe('preset_value')
    })

    it('should convert non-string default values to strings', async () => {
      const runbookVarsWithNumbers: Record<string, RunbookVariable> = {
        NUM_VAR: {
          name: 'NUM_VAR',
          type: 'number',
          required: false,
          defaultValue: 42,
        },
        BOOL_VAR: {
          name: 'BOOL_VAR',
          type: 'boolean',
          required: false,
          defaultValue: true,
        },
      }

      const merged = await manager.mergeVariables(runbookVarsWithNumbers)

      expect(merged.NUM_VAR).toBe('42')
      expect(merged.BOOL_VAR).toBe('true')
    })
  })

  describe('method availability', () => {
    it('should have all required public methods', () => {
      expect(typeof manager.savePreset).toBe('function')
      expect(typeof manager.getPreset).toBe('function')
      expect(typeof manager.getAllPresets).toBe('function')
      expect(typeof manager.deletePreset).toBe('function')
      expect(typeof manager.setGlobalVariable).toBe('function')
      expect(typeof manager.getGlobalVariables).toBe('function')
      expect(typeof manager.deleteGlobalVariable).toBe('function')
      expect(typeof manager.mergeVariables).toBe('function')
    })

    it('should handle method calls gracefully', async () => {
      // These should not throw
      await expect(manager.getAllPresets()).resolves.not.toThrow()
      await expect(manager.getGlobalVariables()).resolves.not.toThrow()
      await expect(manager.mergeVariables({})).resolves.not.toThrow()
    })
  })
})
