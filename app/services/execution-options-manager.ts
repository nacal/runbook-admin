import type { ExecutionOptions, ExecutionPreset } from '../types/types'
import { Storage } from '../utils/storage'

export class ExecutionOptionsManager {
  private static instance: ExecutionOptionsManager
  private storage = Storage.getInstance()
  private presets: Record<string, ExecutionPreset> = {}
  private defaultOptions: ExecutionOptions = { args: [] }
  private initialized = false

  private constructor() {
    this.initialize()
  }

  static getInstance(): ExecutionOptionsManager {
    if (!ExecutionOptionsManager.instance) {
      ExecutionOptionsManager.instance = new ExecutionOptionsManager()
    }
    return ExecutionOptionsManager.instance
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load presets
      const savedPresets = await this.storage.loadExecutionPresets()
      Object.entries(savedPresets).forEach(([key, preset]) => {
        if (
          typeof preset === 'object' &&
          preset &&
          'name' in preset &&
          'options' in preset
        ) {
          const p = preset as ExecutionPreset & {
            createdAt?: string | Date
            lastUsed?: string | Date
          }
          this.presets[key] = {
            name: p.name,
            description: p.description,
            options: p.options,
            createdAt: new Date(p.createdAt || Date.now()),
            lastUsed: p.lastUsed ? new Date(p.lastUsed) : undefined,
          }
        }
      })

      // Load default options
      const loadedOptions = await this.storage.loadDefaultExecutionOptions()
      if (
        typeof loadedOptions === 'object' &&
        loadedOptions &&
        'args' in loadedOptions
      ) {
        this.defaultOptions = loadedOptions as ExecutionOptions
      } else {
        this.defaultOptions = { args: [] }
      }

      this.initialized = true
      console.log(
        `[ExecutionOptionsManager] Loaded ${Object.keys(this.presets).length} presets`,
      )
    } catch (error) {
      console.error('[ExecutionOptionsManager] Failed to initialize:', error)
      this.initialized = true
    }
  }

  async savePreset(
    name: string,
    options: ExecutionOptions,
    description?: string,
  ): Promise<void> {
    await this.initialize()

    const preset: ExecutionPreset = {
      name,
      description,
      options,
      createdAt: new Date(),
      lastUsed: new Date(),
    }

    this.presets[name] = preset
    await this.persistPresets()
    console.log(`[ExecutionOptionsManager] Saved preset: ${name}`)
  }

  async getPreset(name: string): Promise<ExecutionPreset | undefined> {
    await this.initialize()
    const preset = this.presets[name]
    if (preset) {
      preset.lastUsed = new Date()
      await this.persistPresets()
    }
    return preset
  }

  async getAllPresets(): Promise<ExecutionPreset[]> {
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
      console.log(`[ExecutionOptionsManager] Deleted preset: ${name}`)
      return true
    }
    return false
  }

  async setDefaultOptions(options: ExecutionOptions): Promise<void> {
    await this.initialize()
    this.defaultOptions = options
    await this.storage.saveDefaultExecutionOptions(options)
    console.log('[ExecutionOptionsManager] Updated default options')
  }

  async getDefaultOptions(): Promise<ExecutionOptions> {
    await this.initialize()
    return { ...this.defaultOptions }
  }

  buildCommandArgs(options: ExecutionOptions = { args: [] }): string[] {
    return options.args || []
  }

  private async persistPresets(): Promise<void> {
    try {
      const serializable: Record<
        string,
        Omit<ExecutionPreset, 'createdAt' | 'lastUsed'> & {
          createdAt: string
          lastUsed?: string
        }
      > = Object.fromEntries(
        Object.entries(this.presets).map(([key, preset]) => [
          key,
          {
            name: preset.name,
            description: preset.description,
            options: preset.options,
            createdAt: preset.createdAt.toISOString(),
            lastUsed: preset.lastUsed?.toISOString(),
          },
        ]),
      )
      await this.storage.saveExecutionPresets(serializable)
    } catch (error) {
      console.error(
        '[ExecutionOptionsManager] Failed to persist presets:',
        error,
      )
    }
  }
}
