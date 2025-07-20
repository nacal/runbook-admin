import { useEffect, useState } from 'hono/jsx'
import type { Runbook } from '../lib/types'
import { ExecutionResultModal } from './ExecutionResult'

export function RunbookList() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showExecutionResult, setShowExecutionResult] = useState<string | null>(null)

  useEffect(() => {
    loadRunbooks()
  }, [])

  const loadRunbooks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/runbooks')
      const result = await response.json()

      if (result.success) {
        setRunbooks(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to load runbooks')
    } finally {
      setLoading(false)
    }
  }

  const filteredRunbooks = runbooks.filter(runbook =>
    runbook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    runbook.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    runbook.path.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-slate-400">Scanning runbooks...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-red-400 font-semibold mb-2">Error Loading Runbooks</h3>
        <p class="text-red-300">{error}</p>
        <button
          onClick={loadRunbooks}
          class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Search Bar */}
      <div class="mb-6">
        <input
          type="text"
          placeholder="🔍 Search runbooks..."
          value={searchTerm}
          onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Stats */}
      <div class="mb-6 flex items-center justify-between">
        <div class="text-slate-400">
          Found <span class="text-white font-semibold">{filteredRunbooks.length}</span> runbooks
          {searchTerm && <span> matching "{searchTerm}"</span>}
        </div>
        <button
          onClick={loadRunbooks}
          class="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Runbook Grid */}
      {filteredRunbooks.length === 0 ? (
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-xl text-slate-300 mb-2">No runbooks found</h3>
          <p class="text-slate-500">
            {searchTerm
              ? `No runbooks match "${searchTerm}"`
              : 'No .yml files found in common runbook locations'
            }
          </p>
          {!searchTerm && (
            <div class="mt-4 text-sm text-slate-600">
              <p>Looking for files in:</p>
              <ul class="mt-2 space-y-1">
                <li>**/*.runbook.yml</li>
                <li>**/runbooks/**/*.yml</li>
                <li>**/tests/**/*.yml</li>
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRunbooks.map((runbook) => (
            <RunbookCard 
              key={runbook.id} 
              runbook={runbook} 
              onShowResult={setShowExecutionResult}
            />
          ))}
        </div>
      )}

      {/* Execution Result Modal */}
      {showExecutionResult && (
        <ExecutionResultModal 
          executionId={showExecutionResult}
          onClose={() => setShowExecutionResult(null)}
        />
      )}
    </div>
  )
}

function RunbookCard({ runbook, onShowResult }: { runbook: Runbook, onShowResult: (id: string) => void }) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [showVariables, setShowVariables] = useState(false)
  const [variables, setVariables] = useState<Record<string, string>>({})

  const handleExecute = async () => {
    // Check if variables are needed
    const hasVariables = Object.keys(runbook.variables).length > 0
    if (hasVariables && !showVariables) {
      setShowVariables(true)
      return
    }

    setIsExecuting(true)
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runbookPath: runbook.path,
          variables: variables
        }),
      })

      const result = await response.json()

      if (result.success) {
        setExecutionId(result.executionId)

        // Poll for execution status
        pollExecutionStatus(result.executionId)
      } else {
        alert(`❌ Failed to execute: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Failed to execute ${runbook.name}: ${error}`)
    } finally {
      setIsExecuting(false)
      setShowVariables(false)
    }
  }

  const pollExecutionStatus = async (execId: string) => {
    try {
      const response = await fetch(`/api/executions/${execId}`)
      const result = await response.json()

      if (result.success) {
        console.log(`Execution ${execId} status:`, result.data.status)
        if (result.data.status === 'running' && result.isRunning) {
          setTimeout(() => pollExecutionStatus(execId), 1000)
        } else {
          console.log(`Execution ${execId} completed:`, result.data)
          setExecutionId(null)
          // Show result modal
          onShowResult(execId)
        }
      }
    } catch (error) {
      console.error('Failed to poll execution status:', error)
      setExecutionId(null)
    }
  }

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
      <div class="flex items-start justify-between mb-3">
        <h3 class="font-semibold text-white truncate">{runbook.name}</h3>
        <span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
          {runbook.steps} steps
        </span>
      </div>

      {runbook.description && (
        <p class="text-sm text-slate-400 mb-3 line-clamp-2">
          {runbook.description}
        </p>
      )}

      <div class="text-xs text-slate-500 mb-4">
        <div>📁 {runbook.path}</div>
        <div class="mt-1">
          🕒 {new Date(runbook.lastModified).toLocaleDateString()}
        </div>
      </div>

      {runbook.labels && runbook.labels.length > 0 && (
        <div class="flex flex-wrap gap-1 mb-4">
          {runbook.labels.map((label) => (
            <span
              key={label}
              class="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Variable Input Form */}
      {showVariables && (
        <div class="mb-4 p-3 bg-slate-900/50 border border-slate-600 rounded">
          <h4 class="text-sm font-medium text-white mb-2">Variables Required:</h4>
          <div class="space-y-2">
            {Object.entries(runbook.variables).map(([key, variable]) => (
              <div key={key}>
                <label class="block text-xs text-slate-400 mb-1">
                  {variable.name || key}
                  {variable.required && <span class="text-red-400">*</span>}
                </label>
                <input
                  type={variable.type === 'number' ? 'number' : 'text'}
                  placeholder={variable.defaultValue || `Enter ${key}...`}
                  value={variables[key] || ''}
                  onInput={(e) => handleVariableChange(key, (e.target as HTMLInputElement).value)}
                  class="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
          <div class="flex space-x-2 mt-3">
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              class="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded text-white text-xs"
            >
              {isExecuting ? 'Running...' : 'Execute'}
            </button>
            <button
              onClick={() => setShowVariables(false)}
              class="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-slate-300 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div class="flex space-x-2">
        <button
          onClick={handleExecute}
          disabled={isExecuting || executionId !== null}
          class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors"
        >
          {isExecuting ? (
            <>
              <span class="inline-block animate-spin mr-2">⚡</span>
              Running...
            </>
          ) : executionId ? (
            <>
              <span class="inline-block animate-pulse mr-2">🔄</span>
              Executing...
            </>
          ) : Object.keys(runbook.variables).length > 0 ? (
            '⚙️ Configure & Run'
          ) : (
            '▶️ Run'
          )}
        </button>
        <button class="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm">
          📝
        </button>
      </div>
    </div>
  )
}