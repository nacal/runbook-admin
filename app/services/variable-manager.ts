import type {
  ExecutionOptions,
  RunbookVariable,
  VariablePreset,
} from '../types/types'
import { Storage } from '../utils/storage'

export class VariableManager {
  private static instance: VariableManager
  private storage = Storage.getInstance()
  private presets: Record<string, VariablePreset> = {}
  private globalVariables: Record<string, string> = {}
  private initialized = false

  private constructor() {
    this.initialize()
  }

  static getInstance(): VariableManager {
    if (!VariableManager.instance) {
      VariableManager.instance = new VariableManager()
    }
    return VariableManager.instance
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load presets
      const savedPresets = await this.storage.loadVariablePresets()
      Object.entries(savedPresets).forEach(([key, preset]) => {
        if (
          typeof preset === 'object' &&
          preset &&
          'name' in preset &&
          'variables' in preset
        ) {
          const p = preset as VariablePreset & {
            createdAt?: string | Date
            lastUsed?: string | Date
          }
          this.presets[key] = {
            name: p.name,
            description: p.description,
            variables: p.variables,
            executionOptions: p.executionOptions,
            createdAt: new Date(p.createdAt || Date.now()),
            lastUsed: p.lastUsed ? new Date(p.lastUsed) : undefined,
          }
        }
      })

      // Load global variables
      this.globalVariables = await this.storage.loadGlobalVariables()

      this.initialized = true
      console.log(
        `[VariableManager] Loaded ${Object.keys(this.presets).length} presets and ${Object.keys(this.globalVariables).length} global variables`,
      )
    } catch (error) {
      console.error('[VariableManager] Failed to initialize:', error)
      this.initialized = true
    }
  }

  async savePreset(
    name: string,
    variables: Record<string, string>,
    description?: string,
    executionOptions?: ExecutionOptions,
  ): Promise<void> {
    await this.initialize()

    const preset: VariablePreset = {
      name,
      description,
      variables,
      executionOptions,
      createdAt: new Date(),
      lastUsed: new Date(),
    }

    this.presets[name] = preset
    await this.persistPresets()
    console.log(`[VariableManager] Saved preset: ${name}`)
  }

  async getPreset(name: string): Promise<VariablePreset | undefined> {
    await this.initialize()
    const preset = this.presets[name]
    if (preset) {
      // Update last used time
      preset.lastUsed = new Date()
      await this.persistPresets()
    }
    return preset
  }

  async getAllPresets(): Promise<VariablePreset[]> {
    await this.initialize()
    return Object.values(this.presets).sort(
      (a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0),
    )
  }

  async deletePreset(name: string): Promise<boolean> {
    await this.initialize()
    if (this.presets[name]) {
      delete this.presets[name]
      await this.persistPresets()
      console.log(`[VariableManager] Deleted preset: ${name}`)
      return true
    }
    return false
  }

  async setGlobalVariable(key: string, value: string): Promise<void> {
    await this.initialize()
    this.globalVariables[key] = value
    await this.storage.saveGlobalVariables(this.globalVariables)
    console.log(`[VariableManager] Set global variable: ${key}`)
  }

  async getGlobalVariables(): Promise<Record<string, string>> {
    await this.initialize()
    return { ...this.globalVariables }
  }

  async deleteGlobalVariable(key: string): Promise<boolean> {
    await this.initialize()
    if (this.globalVariables[key]) {
      delete this.globalVariables[key]
      await this.storage.saveGlobalVariables(this.globalVariables)
      console.log(`[VariableManager] Deleted global variable: ${key}`)
      return true
    }
    return false
  }

  async mergeVariables(
    runbookVariables: Record<string, RunbookVariable>,
    presetName?: string,
    overrides: Record<string, string> = {},
  ): Promise<Record<string, string>> {
    await this.initialize()

    const merged: Record<string, string> = {}
    const runbookKeys = Object.keys(runbookVariables)

    // Only process variables that are defined in the runbook
    runbookKeys.forEach(key => {
      // Priority: overrides > preset > global > runbook default
      if (overrides[key] !== undefined) {
        merged[key] = overrides[key]
      } else if (presetName) {
        const preset = this.presets[presetName]
        if (preset?.variables[key] !== undefined) {
          merged[key] = preset.variables[key]
        } else if (this.globalVariables[key] !== undefined) {
          merged[key] = this.globalVariables[key]
        } else if (runbookVariables[key].defaultValue !== undefined) {
          merged[key] = String(runbookVariables[key].defaultValue)
        }
      } else if (this.globalVariables[key] !== undefined) {
        merged[key] = this.globalVariables[key]
      } else if (runbookVariables[key].defaultValue !== undefined) {
        merged[key] = String(runbookVariables[key].defaultValue)
      }
    })

    return merged
  }

  private async persistPresets(): Promise<void> {
    try {
      const serializable: Record<
        string,
        Omit<VariablePreset, 'createdAt' | 'lastUsed'> & {
          createdAt: string
          lastUsed?: string
        }
      > = Object.fromEntries(
        Object.entries(this.presets).map(([key, preset]) => [
          key,
          {
            name: preset.name,
            description: preset.description,
            variables: preset.variables,
            executionOptions: preset.executionOptions,
            createdAt: preset.createdAt.toISOString(),
            lastUsed: preset.lastUsed?.toISOString(),
          },
        ]),
      )
      await this.storage.saveVariablePresets(serializable)
    } catch (error) {
      console.error('[VariableManager] Failed to persist presets:', error)
    }
  }
}
