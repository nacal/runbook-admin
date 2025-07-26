export interface Runbook {
  id: string
  path: string
  name: string
  description?: string
  steps: number
  lastModified: Date
  variables: Record<string, RunbookVariable>
  labels?: string[]
}

export interface ExecutionResult {
  id: string
  runbookId: string
  runbookPath: string
  status: 'running' | 'success' | 'failed'
  exitCode: number
  startTime: Date
  endTime: Date
  duration: number
  output: string[]
  error?: string
  variables: Record<string, string | number | boolean>
}

export interface RunbookVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'env' | 'file' | 'json'
  required: boolean
  defaultValue?: string | number | boolean
  description?: string
  filePath?: string
}

export interface VariablePreset {
  name: string
  description?: string
  variables: Record<string, string>
  executionOptions?: ExecutionOptions
  createdAt: Date
  lastUsed?: Date
}

export interface ExecutionOptions {
  args: string[]
}

export interface ExecutionPreset {
  name: string
  description?: string
  options: ExecutionOptions
  createdAt: Date
  lastUsed?: Date
}

export interface EnvironmentVariable {
  key: string
  value: string
  description?: string
  isSecret?: boolean
  createdAt: Date
  updatedAt: Date
}
