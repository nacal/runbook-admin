import { Storage } from '../utils/storage'

export interface EnvironmentVariable {
  key: string
  value: string
  description?: string
  isSecret?: boolean
  createdAt: Date
  updatedAt: Date
}

export class EnvironmentManager {
  private static instance: EnvironmentManager
  private storage = Storage.getInstance()
  private variables: Map<string, EnvironmentVariable> = new Map()
  private initialized = false

  private constructor() {
    this.initialize()
  }

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager()
    }
    return EnvironmentManager.instance
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const saved = await this.storage.loadEnvironmentVariables()
      Object.entries(saved).forEach(([key, variable]) => {
        this.variables.set(key, {
          ...variable,
          createdAt: new Date(variable.createdAt),
          updatedAt: new Date(variable.updatedAt),
        })
      })
      this.initialized = true
      console.log(
        `[EnvironmentManager] Loaded ${this.variables.size} environment variables`,
      )
    } catch (error) {
      console.error('[EnvironmentManager] Failed to initialize:', error)
      this.initialized = true
    }
  }

  async setVariable(
    key: string,
    value: string,
    description?: string,
    isSecret?: boolean,
  ): Promise<void> {
    await this.initialize()

    const now = new Date()
    const existing = this.variables.get(key)

    const variable: EnvironmentVariable = {
      key,
      value,
      description,
      isSecret: isSecret || false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }

    this.variables.set(key, variable)
    await this.persist()
    console.log(`[EnvironmentManager] Set environment variable: ${key}`)
  }

  async getVariable(key: string): Promise<string | undefined> {
    await this.initialize()
    return this.variables.get(key)?.value
  }

  async getAllVariables(): Promise<EnvironmentVariable[]> {
    await this.initialize()
    return Array.from(this.variables.values()).sort((a, b) =>
      a.key.localeCompare(b.key),
    )
  }

  async deleteVariable(key: string): Promise<boolean> {
    await this.initialize()
    if (this.variables.has(key)) {
      this.variables.delete(key)
      await this.persist()
      console.log(`[EnvironmentManager] Deleted environment variable: ${key}`)
      return true
    }
    return false
  }

  async getEnvironmentForExecution(): Promise<Record<string, string>> {
    await this.initialize()
    const env: Record<string, string> = {}

    // Include process environment variables
    Object.assign(env, process.env)

    // Override with managed environment variables
    this.variables.forEach((variable, key) => {
      env[key] = variable.value
    })

    return env
  }

  async getMaskedVariables(): Promise<EnvironmentVariable[]> {
    await this.initialize()
    return Array.from(this.variables.values())
      .map((variable) => ({
        ...variable,
        value: variable.isSecret
          ? '•'.repeat(variable.value.length)
          : variable.value,
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }

  private async persist(): Promise<void> {
    try {
      const serializable: Record<string, any> = {}
      this.variables.forEach((variable, key) => {
        serializable[key] = {
          ...variable,
          createdAt: variable.createdAt.toISOString(),
          updatedAt: variable.updatedAt.toISOString(),
        }
      })
      await this.storage.saveEnvironmentVariables(serializable)
    } catch (error) {
      console.error('[EnvironmentManager] Failed to persist:', error)
    }
  }
}
