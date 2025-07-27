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
    // Extract async setup outside Promise constructor
    const setupExecution = async () => {
      if (this.process) {
        throw new Error('Execution already in progress')
      }

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

      // 環境変数付きのコマンド文字列を生成
      const envString =
        Object.keys(envVars).length > 0
          ? `${Object.entries(envVars)
              .map(([key, value]) => `${key}=${value}`)
              .join(' ')} `
          : ''
      const fullCommand = `${envString}runn ${args.join(' ')}`

      console.log(`\n🚀 EXECUTING COMMAND 🚀`)
      console.log(`Command: ${fullCommand}`)
      console.log(`Working Directory: ${getProjectPath()}`)
      console.log(`Execution ID: ${this.executionId}`)
      if (Object.keys(envVars).length > 0) {
        console.log(`Environment Variables: ${Object.keys(envVars).join(', ')}`)
      }
      if (Object.keys(runbookVars).length > 0) {
        console.log(`Runbook Variables: ${Object.keys(runbookVars).join(', ')}`)
      }
      console.log(`=====================================\n`)

      console.log(`[RunnExecutor] Starting execution ${this.executionId}`)
      console.log(`[RunnExecutor] Working directory: ${getProjectPath()}`)
      console.log(`[RunnExecutor] Full command: ${fullCommand}`)

      // Get environment variables for execution
      const envManager = EnvironmentManager.getInstance()
      const execEnv = await envManager.getEnvironmentForExecution()

      return { startTime, args, execEnv, envVars }
    }

    return setupExecution().then(({ startTime, args, execEnv, envVars }) => {
      return new Promise((resolve, reject) => {
        const _fullCommand = `runn ${args.join(' ')}`
        console.log(`[RunnExecutor] About to spawn runn process...`)
        this.process = spawn('runn', args, {
          cwd: getProjectPath(),
          stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin to prevent hanging
          env: {
            ...process.env, // Preserve current environment (including PATH)
            ...execEnv, // Add managed environment variables
            ...envVars, // Add user-provided environment variables
            // Ensure common paths are included for runn command
            PATH:
              (process.env.PATH || '') +
              ':/opt/homebrew/bin:/usr/local/bin:/usr/local/go/bin',
          },
        })
        console.log(
          `[RunnExecutor] Spawned runn process with PID: ${this.process.pid}`,
        )

        // 実際にコピーして実行できるコマンドを表示
        const envString =
          Object.keys(envVars).length > 0
            ? `${Object.entries(envVars)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ')} `
            : ''
        const copyableCommand = `cd "${getProjectPath()}" && ${envString}runn ${args.join(' ')}`
        console.log(`\n📋 COPY & RUN THIS COMMAND:`)
        console.log(copyableCommand)
        console.log(`==============================\n`)

        let output = ''
        let errorOutput = ''
        let timeoutHandle: NodeJS.Timeout | null = null

        this.emit('started', { id: this.executionId, runbookPath, startTime })
        console.log(
          `[RunnExecutor] Emitted 'started' event for ${this.executionId}`,
        )

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
          // より目立つログ出力
          console.log(`\n=== RUNN STDOUT ===`)
          console.log(chunk.trim())
          console.log(`===================\n`)
          this.emit('output', { chunk, timestamp: new Date() })
        })

        this.process.stderr?.on('data', (data) => {
          const chunk = data.toString()
          errorOutput += chunk
          // より目立つログ出力
          console.log(`\n=== RUNN STDERR ===`)
          console.log(chunk.trim())
          console.log(`===================\n`)
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
