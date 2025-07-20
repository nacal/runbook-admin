import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { ExecutionResult } from './types'

export class Storage {
  private static instance: Storage
  private storageDir: string
  private historyFile: string

  private constructor() {
    this.storageDir = join(homedir(), '.runbook-admin')
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
      console.log(`[Storage] Created storage directory: ${this.storageDir}`)
    }
  }

  async saveExecutionHistory(executions: ExecutionResult[]): Promise<void> {
    try {
      await this.ensureStorageDir()
      
      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        executions: executions
      }

      await writeFile(this.historyFile, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`[Storage] Saved ${executions.length} executions to ${this.historyFile}`)
    } catch (error) {
      console.error('[Storage] Failed to save execution history:', error)
    }
  }

  async loadExecutionHistory(): Promise<ExecutionResult[]> {
    try {
      if (!existsSync(this.historyFile)) {
        console.log('[Storage] No existing history file found')
        return []
      }

      const content = await readFile(this.historyFile, 'utf-8')
      const data = JSON.parse(content)

      if (data.version !== '1.0') {
        console.warn('[Storage] History file version mismatch, starting fresh')
        return []
      }

      // Convert date strings back to Date objects
      const executions = data.executions.map((exec: any) => ({
        ...exec,
        startTime: new Date(exec.startTime),
        endTime: new Date(exec.endTime)
      }))

      console.log(`[Storage] Loaded ${executions.length} executions from ${this.historyFile}`)
      return executions
    } catch (error) {
      console.error('[Storage] Failed to load execution history:', error)
      return []
    }
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      await this.ensureStorageDir()
      const settingsFile = join(this.storageDir, 'settings.json')
      
      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings
      }

      await writeFile(settingsFile, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`[Storage] Saved settings to ${settingsFile}`)
    } catch (error) {
      console.error('[Storage] Failed to save settings:', error)
    }
  }

  async loadSettings(): Promise<Record<string, any>> {
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
        await writeFile(this.historyFile, JSON.stringify({
          version: '1.0',
          timestamp: new Date().toISOString(),
          executions: []
        }, null, 2), 'utf-8')
        console.log('[Storage] Cleared execution history')
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
        favorites
      }

      await writeFile(favoritesFile, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`[Storage] Saved ${favorites.length} favorites to ${favoritesFile}`)
    } catch (error) {
      console.error('[Storage] Failed to save favorites:', error)
    }
  }

  async loadFavorites(): Promise<string[]> {
    try {
      const favoritesFile = join(this.storageDir, 'favorites.json')
      
      if (!existsSync(favoritesFile)) {
        console.log('[Storage] No existing favorites file found')
        return []
      }

      const content = await readFile(favoritesFile, 'utf-8')
      const data = JSON.parse(content)

      if (data.version !== '1.0') {
        console.warn('[Storage] Favorites file version mismatch, starting fresh')
        return []
      }

      console.log(`[Storage] Loaded ${data.favorites.length} favorites from ${favoritesFile}`)
      return data.favorites || []
    } catch (error) {
      console.error('[Storage] Failed to load favorites:', error)
      return []
    }
  }

  getStoragePath(): string {
    return this.storageDir
  }
}