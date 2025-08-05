import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EnvironmentVariable } from '../../app/types/types'

// Simple EnvironmentManager tests that focus on logic rather than file I/O
describe('EnvironmentManager (Simple Tests)', () => {
  let EnvironmentManager: typeof import('../../app/services/environment-manager').EnvironmentManager
  let manager: import('../../app/services/environment-manager').EnvironmentManager

  beforeEach(async () => {
    // Reset singleton
    const environmentManagerModule = await import(
      '../../app/services/environment-manager'
    )
    EnvironmentManager = environmentManagerModule.EnvironmentManager
    const EnvironmentManagerWithPrivateAccess =
      EnvironmentManager as unknown as {
        instance?: unknown
      }
    EnvironmentManagerWithPrivateAccess.instance = undefined

    manager = EnvironmentManager.getInstance()

    // Wait for potential initialization
    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = EnvironmentManager.getInstance()
      const instance2 = EnvironmentManager.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should handle concurrent access', () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(EnvironmentManager.getInstance()),
      )

      return Promise.all(promises).then((instances) => {
        const firstInstance = instances[0]
        instances.forEach((instance) => {
          expect(instance).toBe(firstInstance)
        })
      })
    })
  })

  describe('environment variable management', () => {
    it('should set and get environment variables', async () => {
      const key = 'TEST_VAR'
      const value = 'test_value'
      const description = 'Test variable description'

      await manager.setVariable(key, value, description, false)

      const retrievedValue = await manager.getVariable(key)
      expect(retrievedValue).toBe(value)
    })

    it('should set secret environment variables', async () => {
      const key = 'SECRET_VAR'
      const value = 'secret_value'
      const description = 'Secret variable'

      await manager.setVariable(key, value, description, true)

      const retrievedValue = await manager.getVariable(key)
      expect(retrievedValue).toBe(value)

      // Check that it's marked as secret in getAllVariables
      const allVars = await manager.getAllVariables()
      const secretVar = allVars.find((v: EnvironmentVariable) => v.key === key)
      expect(secretVar?.isSecret).toBe(true)
    })

    it('should set variable without optional parameters', async () => {
      const key = 'SIMPLE_VAR'
      const value = 'simple_value'

      await manager.setVariable(key, value)

      const retrievedValue = await manager.getVariable(key)
      expect(retrievedValue).toBe(value)

      const allVars = await manager.getAllVariables()
      const simpleVar = allVars.find((v: EnvironmentVariable) => v.key === key)
      expect(simpleVar?.description).toBeUndefined()
      expect(simpleVar?.isSecret).toBe(false)
    })

    it('should update existing variable', async () => {
      const key = 'UPDATE_VAR'
      const originalValue = 'original_value'
      const updatedValue = 'updated_value'

      // Set initial value
      await manager.setVariable(key, originalValue)
      const allVarsBefore = await manager.getAllVariables()
      const varBefore = allVarsBefore.find(
        (v: EnvironmentVariable) => v.key === key,
      )

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Update value
      await manager.setVariable(key, updatedValue, 'Updated description')

      const retrievedValue = await manager.getVariable(key)
      expect(retrievedValue).toBe(updatedValue)

      const allVarsAfter = await manager.getAllVariables()
      const varAfter = allVarsAfter.find(
        (v: EnvironmentVariable) => v.key === key,
      )

      // createdAt should remain the same, updatedAt should change
      expect(varAfter?.createdAt).toEqual(varBefore?.createdAt)
      expect(varAfter?.updatedAt.getTime()).toBeGreaterThan(
        varBefore?.updatedAt.getTime() || 0,
      )
      expect(varAfter?.description).toBe('Updated description')
    })

    it('should get all variables sorted by key', async () => {
      const variables = [
        { key: 'Z_VAR', value: 'z_value' },
        { key: 'A_VAR', value: 'a_value' },
        { key: 'M_VAR', value: 'm_value' },
      ]

      // Set variables in random order
      for (const variable of variables) {
        await manager.setVariable(variable.key, variable.value)
      }

      const allVars = await manager.getAllVariables()
      const ourVars = allVars.filter((v: EnvironmentVariable) =>
        ['Z_VAR', 'A_VAR', 'M_VAR'].includes(v.key),
      )

      // Should be sorted alphabetically
      expect(ourVars.map((v: EnvironmentVariable) => v.key)).toEqual([
        'A_VAR',
        'M_VAR',
        'Z_VAR',
      ])

      // Check that all have required fields
      ourVars.forEach((v: EnvironmentVariable) => {
        expect(v).toHaveProperty('key')
        expect(v).toHaveProperty('value')
        expect(v).toHaveProperty('createdAt')
        expect(v).toHaveProperty('updatedAt')
        expect(v.createdAt).toBeInstanceOf(Date)
        expect(v.updatedAt).toBeInstanceOf(Date)
      })
    })

    it('should delete environment variables', async () => {
      const key = 'DELETE_VAR'
      const value = 'delete_value'

      // Set variable
      await manager.setVariable(key, value)
      expect(await manager.getVariable(key)).toBe(value)

      // Delete variable
      const deleted = await manager.deleteVariable(key)
      expect(deleted).toBe(true)

      // Should no longer exist
      expect(await manager.getVariable(key)).toBeUndefined()

      const allVars = await manager.getAllVariables()
      const deletedVar = allVars.find((v: EnvironmentVariable) => v.key === key)
      expect(deletedVar).toBeUndefined()
    })

    it('should return false when deleting non-existent variable', async () => {
      const deleted = await manager.deleteVariable('NON_EXISTENT')
      expect(deleted).toBe(false)
    })

    it('should return undefined for non-existent variable', async () => {
      const value = await manager.getVariable('NON_EXISTENT')
      expect(value).toBeUndefined()
    })
  })

  describe('execution environment', () => {
    it('should provide environment for execution', async () => {
      const key = 'EXEC_VAR'
      const value = 'exec_value'

      await manager.setVariable(key, value)

      const execEnv = await manager.getEnvironmentForExecution()

      expect(execEnv).toHaveProperty(key)
      expect(execEnv[key]).toBe(value)

      // Should also include process.env variables
      expect(execEnv).toHaveProperty('PATH') // PATH should exist in most environments
    })

    it('should override process.env with managed variables', async () => {
      const key = 'PATH' // Override existing env var
      const customValue = 'custom_path_value'

      const originalPath = process.env.PATH

      await manager.setVariable(key, customValue)

      const execEnv = await manager.getEnvironmentForExecution()

      expect(execEnv[key]).toBe(customValue)
      expect(execEnv[key]).not.toBe(originalPath)
    })

    it('should include multiple managed variables in execution environment', async () => {
      const variables = {
        EXEC_VAR1: 'value1',
        EXEC_VAR2: 'value2',
        EXEC_VAR3: 'value3',
      }

      for (const [key, value] of Object.entries(variables)) {
        await manager.setVariable(key, value)
      }

      const execEnv = await manager.getEnvironmentForExecution()

      for (const [key, value] of Object.entries(variables)) {
        expect(execEnv[key]).toBe(value)
      }
    })
  })

  describe('masked variables for display', () => {
    it('should mask secret variables', async () => {
      const secretKey = 'SECRET_KEY'
      const secretValue = 'very_secret_value'
      const normalKey = 'NORMAL_KEY'
      const normalValue = 'normal_value'

      await manager.setVariable(secretKey, secretValue, 'Secret variable', true)
      await manager.setVariable(
        normalKey,
        normalValue,
        'Normal variable',
        false,
      )

      const maskedVars = await manager.getMaskedVariables()

      const secretVar = maskedVars.find((v) => v.key === secretKey)
      const normalVar = maskedVars.find((v) => v.key === normalKey)

      expect(secretVar?.value).toBe('•'.repeat(secretValue.length))
      expect(secretVar?.isSecret).toBe(true)

      expect(normalVar?.value).toBe(normalValue)
      expect(normalVar?.isSecret).toBe(false)
    })

    it('should return masked variables sorted by key', async () => {
      await manager.setVariable('Z_SECRET', 'secret', undefined, true)
      await manager.setVariable('A_NORMAL', 'normal', undefined, false)

      const maskedVars = await manager.getMaskedVariables()
      const ourVars = maskedVars.filter((v) =>
        ['Z_SECRET', 'A_NORMAL'].includes(v.key),
      )

      expect(ourVars.map((v) => v.key)).toEqual(['A_NORMAL', 'Z_SECRET'])
    })

    it('should mask empty secret values correctly', async () => {
      const key = 'EMPTY_SECRET'
      const value = ''

      await manager.setVariable(key, value, undefined, true)

      const maskedVars = await manager.getMaskedVariables()
      const emptyVar = maskedVars.find((v) => v.key === key)

      expect(emptyVar?.value).toBe('')
      expect(emptyVar?.isSecret).toBe(true)
    })
  })

  describe('data consistency', () => {
    it('should maintain consistent timestamps', async () => {
      const key = 'TIMESTAMP_VAR'
      const value = 'timestamp_value'

      const beforeTime = new Date()
      await manager.setVariable(key, value)
      const afterTime = new Date()

      const allVars = await manager.getAllVariables()
      const timestampVar = allVars.find(
        (v: EnvironmentVariable) => v.key === key,
      )

      expect(timestampVar?.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      )
      expect(timestampVar?.createdAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      )
      expect(timestampVar?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      )
      expect(timestampVar?.updatedAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      )
    })

    it('should handle special characters in keys and values', async () => {
      const specialCases = [
        { key: 'VAR_WITH_DASHES', value: 'dash-value' },
        { key: 'VAR_WITH_DOTS', value: 'dot.value' },
        { key: 'VAR_WITH_NUMBERS_123', value: '123_value' },
        { key: 'VAR_WITH_SYMBOLS', value: 'symbol@#$%^&*()_value' },
      ]

      for (const { key, value } of specialCases) {
        await expect(manager.setVariable(key, value)).resolves.not.toThrow()
        expect(await manager.getVariable(key)).toBe(value)
      }
    })

    it('should handle empty and whitespace values', async () => {
      const edgeCases = [
        { key: 'EMPTY_VAR', value: '' },
        { key: 'SPACE_VAR', value: ' ' },
        { key: 'TAB_VAR', value: '\t' },
        { key: 'NEWLINE_VAR', value: '\n' },
        { key: 'MULTI_SPACE_VAR', value: '   multiple   spaces   ' },
      ]

      for (const { key, value } of edgeCases) {
        await manager.setVariable(key, value)
        expect(await manager.getVariable(key)).toBe(value)
      }
    })
  })

  describe('method availability', () => {
    it('should have all required public methods', () => {
      expect(typeof manager.setVariable).toBe('function')
      expect(typeof manager.getVariable).toBe('function')
      expect(typeof manager.getAllVariables).toBe('function')
      expect(typeof manager.deleteVariable).toBe('function')
      expect(typeof manager.getEnvironmentForExecution).toBe('function')
      expect(typeof manager.getMaskedVariables).toBe('function')
    })

    it('should handle method calls gracefully', async () => {
      // These should not throw
      await expect(manager.getAllVariables()).resolves.not.toThrow()
      await expect(manager.getVariable('test')).resolves.not.toThrow()
      await expect(manager.getEnvironmentForExecution()).resolves.not.toThrow()
      await expect(manager.getMaskedVariables()).resolves.not.toThrow()
      await expect(manager.deleteVariable('test')).resolves.not.toThrow()
    })

    it('should return appropriate types', async () => {
      const allVars = await manager.getAllVariables()
      const maskedVars = await manager.getMaskedVariables()
      const execEnv = await manager.getEnvironmentForExecution()
      const varValue = await manager.getVariable('test')
      const deleteResult = await manager.deleteVariable('test')

      expect(Array.isArray(allVars)).toBe(true)
      expect(Array.isArray(maskedVars)).toBe(true)
      expect(typeof execEnv).toBe('object')
      expect(typeof varValue === 'string' || varValue === undefined).toBe(true)
      expect(typeof deleteResult).toBe('boolean')
    })
  })
})
