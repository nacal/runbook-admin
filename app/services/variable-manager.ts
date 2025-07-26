import { Storage } from '../utils/storage'
import type { ExecutionOptions } from './execution-options-manager'
import type { RunbookVariable } from '../types/types'

export interface VariablePreset {
  name: string
  description?: string
  variables: Record<string, string>
  executionOptions?: ExecutionOptions
  createdAt: Date
  lastUsed?: Date
}

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
        if (typeof preset === 'object' && preset && 'name' in preset && 'variables' in preset) {
          const p = preset as VariablePreset & { createdAt?: string | Date; lastUsed?: string | Date }
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

    // Start with global variables
    Object.assign(merged, this.globalVariables)

    // Apply preset variables if specified
    if (presetName) {
      const preset = await this.getPreset(presetName)
      if (preset) {
        Object.assign(merged, preset.variables)
      }
    }

    // Apply runbook default values
    Object.entries(runbookVariables).forEach(([key, variable]) => {
      if (variable.defaultValue && !merged[key]) {
        merged[key] = String(variable.defaultValue)
      }
    })

    // Apply user overrides (highest priority)
    Object.assign(merged, overrides)

    return merged
  }

  private async persistPresets(): Promise<void> {
    try {
      const serializable: Record<string, unknown> = Object.fromEntries(
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
