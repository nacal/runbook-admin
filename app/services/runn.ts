import { type ChildProcess, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { ExecutionOptions, ExecutionResult } from '../types/types'
import { getProjectPath } from '../utils/project-context'
import { EnvironmentManager } from './environment-manager'
import { ExecutionOptionsManager } from './execution-options-manager'

export class RunnExecutor extends EventEmitter {
  private process: ChildProcess | null = null
  public readonly executionId: string

  constructor() {
    super()
    this.executionId = this.generateId()
  }

  async execute(
    runbookPath: string,
    variables: Record<string, string | number | boolean> = {},
    timeout: number = 60000,
    executionOptions?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    // Check for concurrent execution before any async setup
    if (this.process) {
      throw new Error('Execution already in progress')
    }

    // Extract async setup outside Promise constructor
    const setupExecution = async () => {
      const startTime = new Date()
      const args = ['run', runbookPath]

      // 環境変数とrunbook変数を分離
      // runbookのvarsセクションで定義される変数は--varで渡す
      // ${}で参照される環境変数は環境変数として渡す
      const envVars: Record<string, string> = {}
      const runbookVars: Record<string, string> = {}

      Object.entries(variables).forEach(([key, value]) => {
        const strValue = String(value)
        // varsセクションの変数（小文字や_で始まる）はrunbook変数
        // 環境変数は通常大文字とアンダースコアのみ
        if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
          // 大文字のみの変数は環境変数として扱う
          envVars[key] = strValue
        } else {
          // それ以外はrunbook変数（varsセクションで定義される変数）
          runbookVars[key] = strValue
        }
      })

      // Add runbook variables using --var flag
      Object.entries(runbookVars).forEach(([key, value]) => {
        args.push('--var', `${key}:${value}`)
      })

      // Add execution options
      if (executionOptions) {
        const optionsManager = ExecutionOptionsManager.getInstance()
        const optionArgs = optionsManager.buildCommandArgs(executionOptions)
        args.push(...optionArgs)
      }

      // 環境変数付きのコマンド文字列を生成（デバッグ用）
      // const envString =
      //   Object.keys(envVars).length > 0
      //     ? `${Object.entries(envVars)
      //         .map(([key, value]) => `${key}=${value}`)
      //         .join(' ')} `
      //     : ''
      // const fullCommand = `${envString}runn ${args.join(' ')}`

      // Get environment variables for execution
      const envManager = EnvironmentManager.getInstance()
      const execEnv = await envManager.getEnvironmentForExecution()

      return { startTime, args, execEnv, envVars }
    }

    return setupExecution().then(({ startTime, args, execEnv, envVars }) => {
      return new Promise((resolve, reject) => {
        // 最終的な環境変数を構築
        const finalEnv = {
          ...process.env, // Preserve current environment (including PATH)
          ...execEnv, // Add managed environment variables
          ...envVars, // Add user-provided environment variables
          // Ensure common paths are included for runn command
          PATH:
            (process.env.PATH || '') +
            ':/opt/homebrew/bin:/usr/local/bin:/usr/local/go/bin',
        }

        this.process = spawn('runn', args, {
          cwd: getProjectPath(),
          stdio: ['pipe', 'pipe', 'pipe'],
          env: finalEnv,
        })

        // Close stdin immediately to prevent hanging on input
        if (this.process.stdin) {
          this.process.stdin.end()
        }

        let output = ''
        let errorOutput = ''
        let timeoutHandle: NodeJS.Timeout | null = null

        this.emit('started', { id: this.executionId, runbookPath, startTime })

        // Set up timeout
        timeoutHandle = setTimeout(() => {
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

          this.emit('complete', result)
          resolve(result)
        })

        this.process.on('error', (error) => {
          // ENOENTエラーの場合、より具体的なエラーメッセージを提供
          let errorMessage = `Failed to start runn: ${error.message}`
          if (error.message.includes('ENOENT')) {
            errorMessage = `runn command not found. Please install runn: go install github.com/k1LoW/runn/cmd/runn@latest`
          }

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
            error: errorMessage,
            variables,
          }

          this.emit('complete', result)
          reject(result)
        })
      })
    })
  }

  async list(
    pattern: string = '**/*.yml',
  ): Promise<Array<Record<string, string | number | boolean>>> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('runn', ['list', pattern, '--long'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH:
            (process.env.PATH || '') +
            ':/opt/homebrew/bin:/usr/local/bin:/usr/local/go/bin',
        },
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

  private parseListOutput(
    output: string,
  ): Array<Record<string, string | number | boolean>> {
    const lines = output.split('\n')
    const results: Array<Record<string, string | number | boolean>> = []

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
        env: {
          ...process.env,
          PATH:
            (process.env.PATH || '') +
            ':/opt/homebrew/bin:/usr/local/bin:/usr/local/go/bin',
        },
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
