import { type ChildProcess, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { ExecutionResult } from '../types/types'
import { EnvironmentManager } from './environment-manager'
import {
  type ExecutionOptions,
  ExecutionOptionsManager,
} from './execution-options-manager'

export class RunnExecutor extends EventEmitter {
  private process: ChildProcess | null = null
  public readonly executionId: string

  constructor() {
    super()
    this.executionId = this.generateId()
  }

  async execute(
    runbookPath: string,
    variables: Record<string, any> = {},
    timeout: number = 60000,
    executionOptions?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    return new Promise(async (resolve, reject) => {
      if (this.process) {
        reject(new Error('Execution already in progress'))
        return
      }

      const startTime = new Date()
      const args = ['run', runbookPath]

      // Add variables using --var flag
      Object.entries(variables).forEach(([key, value]) => {
        args.push('--var', `${key}:${value}`)
      })

      // Add execution options
      if (executionOptions) {
        const optionsManager = ExecutionOptionsManager.getInstance()
        const optionArgs = optionsManager.buildCommandArgs(executionOptions)
        args.push(...optionArgs)
      }

      console.log(
        `[RunnExecutor] Starting execution ${this.executionId}:`,
        'runn',
        args.join(' '),
      )

      // Get environment variables for execution
      const envManager = EnvironmentManager.getInstance()
      const execEnv = await envManager.getEnvironmentForExecution()

      this.process = spawn('runn', args, {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin to prevent hanging
        env: {
          ...process.env, // Preserve current environment (including PATH)
          ...execEnv, // Add managed environment variables
        },
      })

      let output = ''
      let errorOutput = ''
      let timeoutHandle: NodeJS.Timeout | null = null

      this.emit('started', { id: this.executionId, runbookPath, startTime })

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        console.log(
          `[RunnExecutor] Execution ${this.executionId} timed out after ${timeout}ms`,
        )
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
        console.log(
          `[RunnExecutor] Process ${this.executionId} closed with code:`,
          code,
        )
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
          output: output.split('\n').filter((line) => line.trim()),
          error: code !== 0 ? errorOutput : undefined,
          variables,
        }

        console.log(
          `[RunnExecutor] Emitting complete event for ${this.executionId}:`,
          result.status,
        )
        this.emit('complete', result)
        resolve(result)
      })

      this.process.on('error', (error) => {
        console.log(
          `[RunnExecutor] Process ${this.executionId} error:`,
          error.message,
        )
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
          variables,
        }

        this.emit('complete', result)
        reject(result)
      })
    })
  }

  async list(pattern: string = '**/*.yml'): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('runn', ['list', pattern, '--long'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
      })

      let output = ''
      let errorOutput = ''

      childProcess.stdout?.on('data', (data) => {
        output += data.toString()
      })

      childProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })

      childProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = this.parseListOutput(output)
            resolve(result)
          } catch (error) {
            console.error('Failed to parse runn list output:', error)
            resolve([])
          }
        } else {
          reject(new Error(`Runn list failed: ${errorOutput}`))
        }
      })

      childProcess.on('error', (error) => {
        reject(new Error(`Failed to run runn list: ${error.message}`))
      })
    })
  }

  private parseListOutput(output: string): any[] {
    const lines = output.split('\n')
    const results: any[] = []

    // Skip header and separator lines
    let dataStartIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('---')) {
        dataStartIndex = i + 1
        break
      }
    }

    if (dataStartIndex === -1) return results

    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Parse the line format: id, desc, if, steps, path
      const parts = line.split(/\s{2,}/) // Split by 2 or more spaces
      if (parts.length >= 5) {
        results.push({
          id: parts[0].trim(),
          desc: parts[1].trim(),
          if: parts[2].trim(),
          steps: parseInt(parts[3].trim()) || 0,
          path: parts[4].trim(),
        })
      }
    }

    return results
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
    // Use SHA-1 like runn does for compatibility
    return createHash('sha1').update(path).digest('hex')
  }

  static async checkRunnAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const childProcess = spawn('runn', ['--version'], {
        stdio: 'pipe',
        env: process.env,
      })

      childProcess.on('close', (code) => {
        resolve(code === 0)
      })

      childProcess.on('error', () => {
        resolve(false)
      })
    })
  }
}
