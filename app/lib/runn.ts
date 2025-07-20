import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import type { ExecutionResult } from './types'

export class RunnExecutor extends EventEmitter {
  private process: ChildProcess | null = null
  public readonly executionId: string

  constructor() {
    super()
    this.executionId = this.generateId()
  }

  async execute(runbookPath: string, variables: Record<string, any> = {}, timeout: number = 60000): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      if (this.process) {
        reject(new Error('Execution already in progress'))
        return
      }

      const startTime = new Date()
      const args = ['run', runbookPath]
      
      // Add variables using --var flag instead of environment variables
      Object.entries(variables).forEach(([key, value]) => {
        args.push('--var', `${key}:${value}`)
      })

      console.log(`[RunnExecutor] Starting execution ${this.executionId}:`, 'runn', args.join(' '))

      this.process = spawn('runn', args, {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']  // ignore stdin to prevent hanging
      })

      let output = ''
      let errorOutput = ''
      let timeoutHandle: NodeJS.Timeout | null = null

      this.emit('started', { id: this.executionId, runbookPath, startTime })

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        console.log(`[RunnExecutor] Execution ${this.executionId} timed out after ${timeout}ms`)
        if (this.process) {
          this.process.kill('SIGTERM')
          setTimeout(() => {
            if (this.process) {
              this.process.kill('SIGKILL')
            }
          }, 5000)
        }
      }, timeout)

      this.process.stdout?.on('data', (data) => {
        const chunk = data.toString()
        output += chunk
        this.emit('output', { chunk, timestamp: new Date() })
      })

      this.process.stderr?.on('data', (data) => {
        const chunk = data.toString()
        errorOutput += chunk
        this.emit('error', { chunk, timestamp: new Date() })
      })

      this.process.on('close', (code) => {
        console.log(`[RunnExecutor] Process ${this.executionId} closed with code:`, code)
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
          timeoutHandle = null
        }
        this.process = null
        const endTime = new Date()
        
        const result: ExecutionResult = {
          id: this.executionId,
          runbookId: this.generateRunbookId(runbookPath),
          runbookPath,
          status: code === 0 ? 'success' : 'failed',
          exitCode: code || 0,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          output: output.split('\n').filter(line => line.trim()),
          error: code !== 0 ? errorOutput : undefined,
          variables
        }

        console.log(`[RunnExecutor] Emitting complete event for ${this.executionId}:`, result.status)
        this.emit('complete', result)
        resolve(result)
      })

      this.process.on('error', (error) => {
        console.log(`[RunnExecutor] Process ${this.executionId} error:`, error.message)
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
          timeoutHandle = null
        }
        this.process = null
        const endTime = new Date()
        
        const result: ExecutionResult = {
          id: this.executionId,
          runbookId: this.generateRunbookId(runbookPath),
          runbookPath,
          status: 'failed',
          exitCode: -1,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          output: [],
          error: `Failed to start runn: ${error.message}`,
          variables
        }

        this.emit('complete', result)
        reject(result)
      })
    })
  }

  async list(pattern: string = '**/*.yml'): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const process = spawn('runn', ['list', pattern, '--format', 'json'], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let output = ''
      let errorOutput = ''

      process.stdout?.on('data', (data) => {
        output += data.toString()
      })

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(Array.isArray(result) ? result : [])
          } catch (error) {
            resolve([])
          }
        } else {
          reject(new Error(`Runn list failed: ${errorOutput}`))
        }
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to run runn list: ${error.message}`))
      })
    })
  }

  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
      this.emit('stopped')
    }
  }

  isRunning(): boolean {
    return this.process !== null
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10)
  }

  private generateRunbookId(path: string): string {
    return Buffer.from(path).toString('base64').slice(0, 8)
  }

  static async checkRunnAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('runn', ['--version'], { stdio: 'pipe' })
      
      process.on('close', (code) => {
        resolve(code === 0)
      })
      
      process.on('error', () => {
        resolve(false)
      })
    })
  }
}