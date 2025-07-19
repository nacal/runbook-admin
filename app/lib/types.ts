export interface Runbook {
  id: string
  path: string
  name: string
  description?: string
  steps: number
  lastModified: Date
  variables: Record<string, any>
  labels?: string[]
}

export interface ExecutionResult {
  id: string
  runbookId: string
  status: 'running' | 'success' | 'failed'
  startTime: Date
  endTime?: Date
  duration?: number
  output: string[]
  error?: string
  variables: Record<string, any>
}

export interface RunbookVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'env'
  required: boolean
  defaultValue?: any
  description?: string
}