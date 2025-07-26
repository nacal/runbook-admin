import { Storage } from '../utils/storage'

export interface ExecutionOptions {
  // Free-form command line arguments
  args: string[]
}

export interface ExecutionPreset {
  name: string
  description?: string
  options: ExecutionOptions
  createdAt: Date
  lastUsed?: Date
}

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
        if (typeof preset === 'object' && preset.name && preset.options) {
          this.presets[key] = {
            name: preset.name,
            description: preset.description,
            options: preset.options,
            createdAt: new Date(preset.createdAt || Date.now()),
            lastUsed: preset.lastUsed ? new Date(preset.lastUsed) : undefined,
          }
        }
      })

      // Load default options
      const loadedOptions = await this.storage.loadDefaultExecutionOptions()
      this.defaultOptions = loadedOptions.args ? loadedOptions : { args: [] }

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
      const serializable: Record<string, any> = Object.fromEntries(
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
