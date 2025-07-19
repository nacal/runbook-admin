import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import type { ExecutionResult } from './types'

export class RunnExecutor extends EventEmitter {
  private process: ChildProcess | null = null
  private executionId: string

  constructor() {
    super()
    this.executionId = this.generateId()
  }

  async execute(runbookPath: string, variables: Record<string, any> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.process) {
        reject(new Error('Execution already in progress'))
        return
      }

      const args = ['run', runbookPath]
      
      // Add debug flag for better output
      args.push('--debug')
      
      // Add variables as environment variables
      const env = { ...process.env }
      Object.entries(variables).forEach(([key, value]) => {
        env[key] = String(value)
      })

      this.process = spawn('runn', args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let output = ''
      let errorOutput = ''

      this.process.stdout?.on('data', (data) => {
        const chunk = data.toString()
        output += chunk
        this.emit('output', chunk)
      })

      this.process.stderr?.on('data', (data) => {
        const chunk = data.toString()
        errorOutput += chunk
        this.emit('error', chunk)
      })

      this.process.on('close', (code) => {
        this.process = null
        
        const result: ExecutionResult = {
          id: this.executionId,
          runbookId: this.generateRunbookId(runbookPath),
          status: code === 0 ? 'success' : 'failed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 0, // TODO: Calculate actual duration
          output: output.split('\n').filter(line => line.trim()),
          error: code !== 0 ? errorOutput : undefined,
          variables
        }

        this.emit('complete', result)

        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Runn execution failed with code ${code}: ${errorOutput}`))
        }
      })

      this.process.on('error', (error) => {
        this.process = null
        reject(new Error(`Failed to start runn: ${error.message}`))
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