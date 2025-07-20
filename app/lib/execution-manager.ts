import { RunnExecutor } from './runn'
import { Storage } from './storage'
import { createHash } from 'crypto'
import type { ExecutionResult } from './types'

export class ExecutionManager {
  private static instance: ExecutionManager
  private executions = new Map<string, ExecutionResult>()
  private executors = new Map<string, RunnExecutor>()
  private storage = Storage.getInstance()
  private initialized = false

  private constructor() {
    this.initializeFromStorage()
  }

  static getInstance(): ExecutionManager {
    if (!ExecutionManager.instance) {
      ExecutionManager.instance = new ExecutionManager()
    }
    return ExecutionManager.instance
  }

  private async initializeFromStorage(): Promise<void> {
    if (this.initialized) return

    try {
      const savedExecutions = await this.storage.loadExecutionHistory()
      savedExecutions.forEach(execution => {
        this.executions.set(execution.id, execution)
      })
      this.initialized = true
      console.log(`[ExecutionManager] Loaded ${savedExecutions.length} executions from storage`)
    } catch (error) {
      console.error('[ExecutionManager] Failed to initialize from storage:', error)
      this.initialized = true
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      const allExecutions = Array.from(this.executions.values())
      await this.storage.saveExecutionHistory(allExecutions)
    } catch (error) {
      console.error('[ExecutionManager] Failed to persist to storage:', error)
    }
  }

  async startExecution(runbookPath: string, variables: Record<string, any> = {}): Promise<string> {
    const executor = new RunnExecutor()
    const executionId = executor.executionId

    // Store initial execution state
    const initialResult: ExecutionResult = {
      id: executionId,
      runbookId: this.generateRunbookId(runbookPath),
      runbookPath,
      status: 'running',
      exitCode: 0,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      output: [],
      variables
    }

    this.executions.set(executionId, initialResult)
    this.executors.set(executionId, executor)

    // Set up event listeners
    executor.on('started', (data) => {
      console.log(`[ExecutionManager] Execution ${executionId} started:`, data)
    })

    executor.on('output', (data) => {
      console.log(`[ExecutionManager] Output from ${executionId}:`, data.chunk.trim())
      const execution = this.executions.get(executionId)
      if (execution) {
        execution.output.push(`[${data.timestamp.toISOString()}] ${data.chunk}`)
        this.executions.set(executionId, execution)
      }
    })

    executor.on('error', (data) => {
      console.log(`[ExecutionManager] Error from ${executionId}:`, data.chunk.trim())
      const execution = this.executions.get(executionId)
      if (execution) {
        execution.output.push(`[ERROR ${data.timestamp.toISOString()}] ${data.chunk}`)
        this.executions.set(executionId, execution)
      }
    })

    executor.on('complete', (result: ExecutionResult) => {
      console.log(`[ExecutionManager] Execution ${executionId} completed:`, result.status, `(${result.duration}ms)`)
      this.executions.set(executionId, result)
      this.executors.delete(executionId)
      
      // Persist to storage
      this.persistToStorage()
    })

    // Start execution in background with 30 second timeout
    executor.execute(runbookPath, variables, 30000).catch((error) => {
      console.error(`Execution ${executionId} failed:`, error)
    })

    return executionId
  }

  getExecution(executionId: string): ExecutionResult | undefined {
    return this.executions.get(executionId)
  }

  async getAllExecutions(): Promise<ExecutionResult[]> {
    await this.initializeFromStorage()
    return Array.from(this.executions.values()).sort((a, b) => 
      b.startTime.getTime() - a.startTime.getTime()
    )
  }

  stopExecution(executionId: string): boolean {
    const executor = this.executors.get(executionId)
    if (executor) {
      executor.stop()
      this.executors.delete(executionId)
      
      const execution = this.executions.get(executionId)
      if (execution) {
        execution.status = 'failed'
        execution.error = 'Execution stopped by user'
        execution.endTime = new Date()
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime()
        this.executions.set(executionId, execution)
      }
      return true
    }
    return false
  }

  isRunning(executionId: string): boolean {
    return this.executors.has(executionId)
  }

  private generateRunbookId(path: string): string {
    // Use SHA-1 like runn does for compatibility
    return createHash('sha1').update(path).digest('hex')
  }

  async clearHistory(): Promise<void> {
    this.executions.clear()
    await this.storage.clearHistory()
    console.log('[ExecutionManager] Cleared all execution history')
  }

  private generateExecutionId(): string {
    return Math.random().toString(36).substring(2, 10)
  }
}