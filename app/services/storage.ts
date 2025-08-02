import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type {
  EnvironmentVariable,
  ExecutionOptions,
  ExecutionPreset,
  ExecutionResult,
  VariablePreset,
} from '../types/types'

export class Storage {
  private static instance: Storage
  private storageDir: string
  private historyFile: string

  private constructor() {
    // テスト環境では別のディレクトリを使用
    const baseDir =
      process.env.NODE_ENV === 'test'
        ? join(process.cwd(), '.test-storage')
        : join(homedir(), '.runbook-admin')

    this.storageDir = baseDir
    this.historyFile = join(this.storageDir, 'history.json')
  }

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage()
    }
    return Storage.instance
  }

  async ensureStorageDir(): Promise<void> {
    if (!existsSync(this.storageDir)) {
      await mkdir(this.storageDir, { recursive: true })
    }
  }

  async saveExecutionHistory(executions: ExecutionResult[]): Promise<void> {
    try {
      await this.ensureStorageDir()

      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        executions: executions,
      }

      await writeFile(this.historyFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('[Storage] Failed to save execution history:', error)
    }
  }

  async loadExecutionHistory(): Promise<ExecutionResult[]> {
    try {
      if (!existsSync(this.historyFile)) {
        return []
      }

      const content = await readFile(this.historyFile, 'utf-8')

      // JSONファイルが壊れている場合の対処
      let data: unknown
      try {
        data = JSON.parse(content)
      } catch (parseError) {
        console.error(
          '[Storage] Failed to parse history file, creating backup and starting fresh:',
          parseError,
        )
        // バックアップを作成
        const backupFile = `${this.historyFile}.backup.${Date.now()}`
        await writeFile(backupFile, content, 'utf-8')
        return []
      }

      interface HistoryFileData {
        version: string
        executions: ExecutionResult[]
      }

      const historyData = data as HistoryFileData

      if (historyData.version !== '1.0') {
        console.warn('[Storage] History file version mismatch, starting fresh')
        return []
      }

      // Convert date strings back to Date objects
      const executions = historyData.executions.map(
        (exec: ExecutionResult) => ({
          ...exec,
          startTime: new Date(exec.startTime),
          endTime: new Date(exec.endTime),
        }),
      )

      return executions
    } catch (error) {
      console.error('[Storage] Failed to load execution history:', error)
      return []
    }
  }

  async saveSettings(
    settings: Record<string, string | number | boolean>,
  ): Promise<void> {
    try {
      await this.ensureStorageDir()
      const settingsFile = join(this.storageDir, 'settings.json')

      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings,
      }

      await writeFile(settingsFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('[Storage] Failed to save settings:', error)
    }
  }

  async loadSettings(): Promise<Record<string, string | number | boolean>> {
    try {
      const settingsFile = join(this.storageDir, 'settings.json')

      if (!existsSync(settingsFile)) {
        return {}
      }

      const content = await readFile(settingsFile, 'utf-8')
      const data = JSON.parse(content)

      return data.settings || {}
    } catch (error) {
      console.error('[Storage] Failed to load settings:', error)
      return {}
    }
  }

  async clearHistory(): Promise<void> {
    try {
      if (existsSync(this.historyFile)) {
        await writeFile(
          this.historyFile,
          JSON.stringify(
            {
              version: '1.0',
              timestamp: new Date().toISOString(),
              executions: [],
            },
            null,
            2,
          ),
          'utf-8',
        )
      }
    } catch (error) {
      console.error('[Storage] Failed to clear history:', error)
    }
  }

  async saveFavorites(favorites: string[]): Promise<void> {
    try {
      await this.ensureStorageDir()
      const favoritesFile = join(this.storageDir, 'favorites.json')

      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        favorites,
      }

      await writeFile(favoritesFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('[Storage] Failed to save favorites:', error)
    }
  }

  async loadFavorites(): Promise<string[]> {
    try {
      const favoritesFile = join(this.storageDir, 'favorites.json')

      if (!existsSync(favoritesFile)) {
        return []
      }

      const content = await readFile(favoritesFile, 'utf-8')
      const data = JSON.parse(content)

      if (data.version !== '1.0') {
        console.warn(
          '[Storage] Favorites file version mismatch, starting fresh',
        )
        return []
      }

      return data.favorites || []
    } catch (error) {
      console.error('[Storage] Failed to load favorites:', error)
      return []
    }
  }

  async saveVariablePresets(
    presets: Record<
      string,
      Omit<VariablePreset, 'createdAt' | 'lastUsed'> & {
        createdAt: string
        lastUsed?: string
      }
    >,
  ): Promise<void> {
    try {
      await this.ensureStorageDir()
      const presetsFile = join(this.storageDir, 'variable-presets.json')

      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        presets,
      }

      await writeFile(presetsFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('[Storage] Failed to save variable presets:', error)
    }
  }

  async loadVariablePresets(): Promise<
    Record<
      string,
      Omit<VariablePreset, 'createdAt' | 'lastUsed'> & {
        createdAt: string
        lastUsed?: string
      }
    >
  > {
    try {
      const presetsFile = join(this.storageDir, 'variable-presets.json')

      if (!existsSync(presetsFile)) {
        return {}
      }

      const content = await readFile(presetsFile, 'utf-8')
      const data = JSON.parse(content)

      if (data.version !== '1.0') {
        console.warn(
          '[Storage] Variable presets file version mismatch, starting fresh',
        )
        return {}
      }

      return data.presets || {}
    } catch (error) {
      console.error('[Storage] Failed to load variable presets:', error)
      return {}
    }
  }

  async saveGlobalVariables(variables: Record<string, string>): Promise<void> {
    try {
      await this.ensureStorageDir()
      const globalVarsFile = join(this.storageDir, 'global-variables.json')

      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        variables,
      }

      await writeFile(globalVarsFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('[Storage] Failed to save global variables:', error)
    }
  }

  async loadGlobalVariables(): Promise<Record<string, string>> {
    try {
      const globalVarsFile = join(this.storageDir, 'global-variables.json')

      if (!existsSync(globalVarsFile)) {
        return {}
      }

      const content = await readFile(globalVarsFile, 'utf-8')
      const data = JSON.parse(content)

      if (data.version !== '1.0') {
        console.warn(
          '[Storage] Global variables file version mismatch, starting fresh',
        )
        return {}
      }

      return data.variables || {}
    } catch (error) {
      console.error('[Storage] Failed to load global variables:', error)
      return {}
    }
  }

  async saveEnvironmentVariables(
    variables: Record<
      string,
      Omit<EnvironmentVariable, 'createdAt' | 'updatedAt'> & {
        createdAt: string
        updatedAt: string
      }
    >,
  ): Promise<void> {
    try {
      await this.ensureStorageDir()
      const envFile = join(this.storageDir, 'environment.json')

      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        variables,
      }

      await writeFile(envFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('[Storage] Failed to save environment variables:', error)
    }
  }

  async loadEnvironmentVariables(): Promise<
    Record<
      string,
      Omit<EnvironmentVariable, 'createdAt' | 'updatedAt'> & {
        createdAt: string
        updatedAt: string
      }
    >
  > {
    try {
      const envFile = join(this.storageDir, 'environment.json')

      if (!existsSync(envFile)) {
        return {}
      }

      const content = await readFile(envFile, 'utf-8')
      const data = JSON.parse(content)

      if (data.version !== '1.0') {
        console.warn(
          '[Storage] Environment file version mismatch, starting fresh',
        )
        return {}
      }

      return data.variables || {}
    } catch (error) {
      console.error('[Storage] Failed to load environment variables:', error)
      return {}
    }
  }

  async saveExecutionPresets(
    presets: Record<
      string,
      Omit<ExecutionPreset, 'createdAt' | 'lastUsed'> & {
        createdAt: string
        lastUsed?: string
      }
    >,
  ): Promise<void> {
    try {
      await this.ensureStorageDir()
      const presetsFile = join(this.storageDir, 'execution-presets.json')

      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        presets,
      }

      await writeFile(presetsFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('[Storage] Failed to save execution presets:', error)
    }
  }

  async loadExecutionPresets(): Promise<
    Record<
      string,
      Omit<ExecutionPreset, 'createdAt' | 'lastUsed'> & {
        createdAt: string
        lastUsed?: string
      }
    >
  > {
    try {
      const presetsFile = join(this.storageDir, 'execution-presets.json')

      if (!existsSync(presetsFile)) {
        return {}
      }

      const content = await readFile(presetsFile, 'utf-8')
      const data = JSON.parse(content)

      if (data.version !== '1.0') {
        console.warn(
          '[Storage] Execution presets file version mismatch, starting fresh',
        )
        return {}
      }

      return data.presets || {}
    } catch (error) {
      console.error('[Storage] Failed to load execution presets:', error)
      return {}
    }
  }

  async saveDefaultExecutionOptions(options: ExecutionOptions): Promise<void> {
    try {
      await this.ensureStorageDir()
      const optionsFile = join(
        this.storageDir,
        'default-execution-options.json',
      )

      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        options,
      }

      await writeFile(optionsFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error(
        '[Storage] Failed to save default execution options:',
        error,
      )
    }
  }

  async loadDefaultExecutionOptions(): Promise<ExecutionOptions> {
    try {
      const optionsFile = join(
        this.storageDir,
        'default-execution-options.json',
      )

      if (!existsSync(optionsFile)) {
        return { args: [] }
      }

      const content = await readFile(optionsFile, 'utf-8')
      const data = JSON.parse(content)

      if (data.version !== '1.0') {
        console.warn(
          '[Storage] Default execution options file version mismatch, starting fresh',
        )
        return { args: [] }
      }

      return data.options || { args: [] }
    } catch (error) {
      console.error(
        '[Storage] Failed to load default execution options:',
        error,
      )
      return { args: [] }
    }
  }

  getStoragePath(): string {
    return this.storageDir
  }
}
