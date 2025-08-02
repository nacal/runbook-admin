import { useEffect, useState } from 'hono/jsx'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import type { ExecutionResult } from '../types/types'

interface ExecutionResultModalProps {
  executionId: string
  onClose: () => void
}

function ExecutionResultContent({
  execution,
  environmentVariables = {},
}: {
  execution: ExecutionResult
  environmentVariables?: Record<string, { isSecret?: boolean }>
}) {
  const [showSecrets, setShowSecrets] = useState(false)

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '🔄'
      case 'success':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '⏳'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-blue-400'
      case 'success':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  return (
    <div class="space-y-4">
      {/* Status Section */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-slate-900/50 rounded-lg p-3">
          <div class="text-xs text-slate-400 mb-1">Status</div>
          <div
            class={`flex items-center space-x-2 ${getStatusColor(
              execution.status,
            )}`}
          >
            <span class="text-lg">{getStatusIcon(execution.status)}</span>
            <span class="font-medium capitalize">{execution.status}</span>
          </div>
        </div>

        <div class="bg-slate-900/50 rounded-lg p-3">
          <div class="text-xs text-slate-400 mb-1">Duration</div>
          <div class="text-white font-medium">
            {formatDuration(execution.duration)}
          </div>
        </div>

        <div class="bg-slate-900/50 rounded-lg p-3">
          <div class="text-xs text-slate-400 mb-1">Exit Code</div>
          <div
            class={`font-medium ${
              execution.exitCode === 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {execution.exitCode}
          </div>
        </div>
      </div>

      {/* Runbook Info */}
      <div class="bg-slate-900/50 rounded-lg p-3">
        <div class="text-xs text-slate-400 mb-1">Runbook</div>
        <div class="text-white font-medium">{execution.runbookPath}</div>
        <div class="text-xs text-slate-500 mt-1">
          Started: {new Date(execution.startTime).toLocaleString()}
        </div>
      </div>

      {/* Variables - 環境変数とrunbook変数を分けて表示 */}
      {Object.keys(execution.variables).length > 0 &&
        (() => {
          const envVars: Record<string, string | number | boolean> = {}
          const runbookVars: Record<string, string | number | boolean> = {}

          Object.entries(execution.variables).forEach(([key, value]) => {
            if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
              envVars[key] = value
            } else {
              runbookVars[key] = value
            }
          })

          return (
            <>
              {/* Environment Variables */}
              {Object.keys(envVars).length > 0 && (
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <div class="text-xs text-slate-400 mb-2 flex items-center justify-between">
                    <span class="flex items-center space-x-1">
                      <span>🔐 Environment Variables</span>
                      <span class="text-slate-500">
                        ({Object.keys(envVars).length})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      class="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                    >
                      {showSecrets ? '🙈 Hide Secrets' : '👁️ Show Secrets'}
                    </button>
                  </div>
                  <div class="max-h-48 overflow-y-auto space-y-1">
                    {Object.entries(envVars).map(([key, value]) => (
                      <div key={key} class="flex items-start space-x-2">
                        <span class="text-slate-300 text-sm font-mono shrink-0">
                          {key}:
                        </span>
                        <span class="text-slate-300 text-sm break-all">
                          {environmentVariables[key]?.isSecret && !showSecrets
                            ? '•'.repeat(String(value).length)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Runbook Variables */}
              {Object.keys(runbookVars).length > 0 && (
                <div class="bg-slate-900/50 rounded-lg p-3">
                  <div class="text-xs text-slate-400 mb-2">
                    <span class="flex items-center space-x-1">
                      <span>📝 Runbook Variables (vars)</span>
                      <span class="text-slate-500">
                        ({Object.keys(runbookVars).length})
                      </span>
                    </span>
                  </div>
                  <div class="max-h-48 overflow-y-auto space-y-1">
                    {Object.entries(runbookVars).map(([key, value]) => (
                      <div key={key} class="flex items-start space-x-2">
                        <span class="text-blue-300 text-sm font-mono shrink-0">
                          {key}:
                        </span>
                        <span class="text-slate-300 text-sm break-all">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        })()}

      {/* Output */}
      <div class="bg-slate-900/50 rounded-lg p-3">
        <div class="text-xs text-slate-400 mb-2">Output</div>
        <div class="bg-black/50 rounded p-3 max-h-64 overflow-y-auto">
          {execution.output.length > 0 ? (
            <pre class="text-xs text-green-300 font-mono whitespace-pre-wrap">
              {execution.output.join('\n')}
            </pre>
          ) : (
            <div class="text-slate-500 text-sm italic">No output</div>
          )}
        </div>
      </div>

      {/* Error */}
      {execution.error && (
        <div class="bg-slate-900/50 rounded-lg p-3">
          <div class="text-xs text-slate-400 mb-2">Error</div>
          <div class="bg-red-900/20 border border-red-500/30 rounded p-3">
            <pre class="text-xs text-red-300 font-mono whitespace-pre-wrap">
              {execution.error}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export function ExecutionResultModal({
  executionId,
  onClose,
}: ExecutionResultModalProps) {
  const [execution, setExecution] = useState<ExecutionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [environmentVariables, setEnvironmentVariables] = useState<
    Record<string, { isSecret?: boolean }>
  >({})

  useBodyScrollLock(true)

  useEffect(() => {
    const fetchExecution = async () => {
      try {
        const response = await fetch(`/api/executions/${executionId}`)
        const result = await response.json()

        if (result.success) {
          setExecution(result.data)
          setEnvironmentVariables(result.environmentVariables || {})
          setLoading(false)
        } else {
          setError(result.error)
          setLoading(false)
        }
      } catch (_err) {
        setError('Failed to fetch execution result')
        setLoading(false)
      }
    }

    fetchExecution()
  }, [executionId])

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        class="bg-slate-800 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col mx-4"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-center justify-between p-4 border-b border-slate-700">
          <div class="flex items-center space-x-3">
            <h3 class="text-lg font-semibold text-white">Execution Result</h3>
            <span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
              {executionId}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        <div class="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span class="ml-3 text-slate-400">
                Loading execution result...
              </span>
            </div>
          ) : error ? (
            <div class="text-red-400 text-center py-8">
              <p>{error}</p>
            </div>
          ) : execution ? (
            <ExecutionResultContent
              execution={execution}
              environmentVariables={environmentVariables}
            />
          ) : null}
        </div>

        <div class="border-t border-slate-700 p-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
