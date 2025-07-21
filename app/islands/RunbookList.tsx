import { useEffect, useState } from 'hono/jsx'
import type { ExecutionOptions } from '../services/execution-options-manager'
import type { Runbook } from '../types/types'
import { EnvironmentSettings } from './EnvironmentSettings'
import { ExecutionResultModal } from './ExecutionResult'
import { RunbookViewer } from './RunbookViewer'
import { VariableInput } from './VariableInput'

export function RunbookList() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showExecutionResult, setShowExecutionResult] = useState<string | null>(
    null
  )
  const [favorites, setFavorites] = useState<string[]>([])
  const [showVariableInput, setShowVariableInput] = useState<Runbook | null>(
    null
  )
  const [showRunbookViewer, setShowRunbookViewer] = useState<Runbook | null>(
    null
  )
  const [showEnvironmentSettings, setShowEnvironmentSettings] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [executingRunbooks, setExecutingRunbooks] = useState<Set<string>>(
    new Set()
  )

  useEffect(() => {
    loadRunbooks()
    loadFavorites()
  }, [])

  const loadRunbooks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/runbooks')
      const result = await response.json()

      if (result.success) {
        console.log(
          'Loaded runbooks:',
          result.data.map((r: Runbook) => ({ name: r.name, id: r.id }))
        )

        // Check for duplicate IDs
        const ids = result.data.map((r: Runbook) => r.id)
        const uniqueIds = new Set(ids)
        if (ids.length !== uniqueIds.size) {
          console.warn('WARNING: Duplicate runbook IDs detected!')
          const duplicates = ids.filter(
            (id: string, index: number) => ids.indexOf(id) !== index
          )
          console.warn('Duplicate IDs:', duplicates)
        }

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

  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/favorites')
      const result = await response.json()

      if (result.success) {
        setFavorites(result.data)
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
    }
  }

  const executeRunbook = async (
    runbook: Runbook,
    variables: Record<string, string>,
    executionOptions?: ExecutionOptions
  ) => {
    // Mark runbook as executing
    setExecutingRunbooks((prev) => new Set([...prev, runbook.id]))

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runbookPath: runbook.path,
          variables: variables,
          executionOptions: executionOptions,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Poll for execution status and show result when complete
        pollExecutionStatus(result.executionId, runbook.id)
      } else {
        // Remove from executing set on error
        setExecutingRunbooks((prev) => {
          const newSet = new Set(prev)
          newSet.delete(runbook.id)
          return newSet
        })
        alert(`❌ Failed to execute: ${result.error}`)
      }
    } catch (error) {
      // Remove from executing set on error
      setExecutingRunbooks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(runbook.id)
        return newSet
      })
      alert(`❌ Failed to execute ${runbook.name}: ${error}`)
    }
  }

  const pollExecutionStatus = async (execId: string, runbookId?: string) => {
    try {
      const response = await fetch(`/api/executions/${execId}`)
      const result = await response.json()

      if (result.success) {
        console.log(`Execution ${execId} status:`, result.data.status)
        if (result.data.status === 'running' && result.isRunning) {
          setTimeout(() => pollExecutionStatus(execId, runbookId), 1000)
        } else {
          console.log(`Execution ${execId} completed:`, result.data)
          // Remove from executing set when complete
          if (runbookId) {
            setExecutingRunbooks((prev) => {
              const newSet = new Set(prev)
              newSet.delete(runbookId)
              return newSet
            })
          }
          // Show result modal
          setShowExecutionResult(execId)
        }
      }
    } catch (error) {
      console.error('Failed to poll execution status:', error)
      // Remove from executing set on error
      if (runbookId) {
        setExecutingRunbooks((prev) => {
          const newSet = new Set(prev)
          newSet.delete(runbookId)
          return newSet
        })
      }
    }
  }

  const toggleFavorite = async (runbookId: string) => {
    try {
      console.log('Toggling favorite for:', runbookId)
      console.log('Current favorites:', favorites)

      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runbookId }),
      })

      const result = await response.json()
      console.log('Toggle result:', result)

      if (result.success) {
        if (result.isFavorite) {
          const newFavorites = [...favorites, runbookId]
          console.log('Adding to favorites, new list:', newFavorites)
          setFavorites(newFavorites)
        } else {
          const newFavorites = favorites.filter((id) => id !== runbookId)
          console.log('Removing from favorites, new list:', newFavorites)
          setFavorites(newFavorites)
        }
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const filteredRunbooks = runbooks.filter(
    (runbook) =>
      runbook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      runbook.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      runbook.path.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort runbooks: favorites first, then by name
  const sortedRunbooks = [...filteredRunbooks].sort((a, b) => {
    const aIsFavorite = favorites.includes(a.id)
    const bIsFavorite = favorites.includes(b.id)

    if (aIsFavorite && !bIsFavorite) return -1
    if (!aIsFavorite && bIsFavorite) return 1
    return a.name.localeCompare(b.name)
  })

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
          Found{' '}
          <span class="text-white font-semibold">
            {filteredRunbooks.length}
          </span>{' '}
          runbooks
          {searchTerm && <span> matching "{searchTerm}"</span>}
          {favorites.length > 0 && (
            <span class="ml-3">
              <span class="text-yellow-500">⭐</span> {favorites.length}{' '}
              favorites
            </span>
          )}
        </div>
        <div class="flex space-x-2">
          <button
            onClick={() => setShowEnvironmentSettings(true)}
            class="px-3 py-1 text-sm bg-green-700 hover:bg-green-600 rounded text-white"
            title="Manage Environment Variables"
          >
            🌍 Environment
          </button>
          {favorites.length > 0 && (
            <button
              onClick={async () => {
                if (confirm('Clear all favorites?')) {
                  await fetch('/api/favorites', { method: 'DELETE' })
                  setFavorites([])
                }
              }}
              class="px-3 py-1 text-sm bg-red-700 hover:bg-red-600 rounded text-white"
            >
              Clear ⭐
            </button>
          )}
          <button
            onClick={() => {
              loadRunbooks()
              loadFavorites()
            }}
            class="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Runbook Grid */}
      {filteredRunbooks.length === 0 ? (
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-xl text-slate-300 mb-2">No runbooks found</h3>
          <p class="text-slate-500">
            {searchTerm
              ? `No runbooks match "${searchTerm}"`
              : 'No .yml files found in common runbook locations'}
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
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          {sortedRunbooks.map((runbook) => (
            <RunbookCard
              key={runbook.id}
              runbook={runbook}
              isFavorite={favorites.includes(runbook.id)}
              onToggleFavorite={() => toggleFavorite(runbook.id)}
              onShowResult={setShowExecutionResult}
              onShowVariableInput={setShowVariableInput}
              onShowRunbookViewer={setShowRunbookViewer}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              isExecutingGlobally={executingRunbooks.has(runbook.id)}
            />
          ))}
        </div>
      )}

      {/* Variable Input Modal */}
      {showVariableInput && (
        <VariableInput
          runbook={showVariableInput}
          onSubmit={async (variables, executionOptions) => {
            setShowVariableInput(null)
            await executeRunbook(showVariableInput, variables, executionOptions)
          }}
          onCancel={() => setShowVariableInput(null)}
        />
      )}

      {/* Runbook Viewer Modal */}
      {showRunbookViewer && (
        <RunbookViewer
          path={showRunbookViewer.path}
          name={showRunbookViewer.name}
          onClose={() => setShowRunbookViewer(null)}
        />
      )}

      {/* Environment Settings Modal */}
      {showEnvironmentSettings && (
        <EnvironmentSettings
          onClose={() => setShowEnvironmentSettings(false)}
        />
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

function RunbookCard({
  runbook,
  isFavorite,
  onToggleFavorite,
  onShowResult,
  onShowVariableInput,
  onShowRunbookViewer,
  openDropdown,
  setOpenDropdown,
  isExecutingGlobally,
}: {
  runbook: Runbook
  isFavorite: boolean
  onToggleFavorite: () => void
  onShowResult: (id: string) => void
  onShowVariableInput: (runbook: Runbook) => void
  onShowRunbookViewer: (runbook: Runbook) => void
  openDropdown: string | null
  setOpenDropdown: (id: string | null) => void
  isExecutingGlobally: boolean
}) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionId, setExecutionId] = useState<string | null>(null)

  // Check if runbook has required variables
  const hasRequiredVariables = Object.values(runbook.variables).some(
    (variable) => variable.required
  )

  const [executionMode, setExecutionMode] = useState<'quick' | 'configure'>(
    hasRequiredVariables ? 'configure' : 'quick'
  )
  const showDropdown = openDropdown === runbook.id

  useEffect(() => {
    if (!showDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      // Check if click is outside the dropdown container
      if (!target?.closest('.dropdown-container')) {
        setOpenDropdown(null)
      }
    }

    // Add a small delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, { capture: true })
    }, 10)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside, {
        capture: true,
      })
    }
  }, [showDropdown, setOpenDropdown])

  const handleExecute = async () => {
    if (executionMode === 'configure') {
      // Open configuration modal
      onShowVariableInput(runbook)
      return
    }

    // Quick execute without configuration
    setIsExecuting(true)
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runbookPath: runbook.path,
          variables: {},
          executionOptions: { args: [] },
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
    }
  }

  const handleModeSelect = (mode: 'quick' | 'configure') => {
    setExecutionMode(mode)
    setOpenDropdown(null)
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

  return (
    <div
      class={`bg-slate-800/50 border ${
        isFavorite
          ? 'border-yellow-600/50 hover:border-yellow-600'
          : 'border-slate-700 hover:border-slate-600'
      } rounded-lg p-4 transition-colors relative flex flex-col h-full min-h-[280px]`}
    >
      {/* Content area - grows to fill space */}
      <div class="flex flex-col flex-grow">
        <div class="flex items-start justify-between mb-3">
          <h3 class="font-semibold text-white truncate flex items-center">
            {isFavorite && <span class="text-yellow-500 mr-2">⭐</span>}
            {runbook.name}
          </h3>
          <span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
            {runbook.steps} steps
          </span>
        </div>

        {runbook.description && (
          <p class="text-sm text-slate-400 mb-3 line-clamp-2">
            {runbook.description}
          </p>
        )}

        <div class="text-xs text-slate-500">
          <div>📁 {runbook.path}</div>
          <div class="mt-1">
            🕒 {new Date(runbook.lastModified).toLocaleDateString()}
          </div>
          <div class="mt-1 font-mono text-slate-600">
            ID: {runbook.id.substring(0, 7)}
          </div>
        </div>

        {/* Spacer to push labels to bottom of content area */}
        <div class="flex-grow"></div>

        {/* Labels section - always takes same space */}
        <div class="h-8 mt-4 mb-4">
          {runbook.labels && runbook.labels.length > 0 && (
            <div class="flex flex-wrap gap-1">
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
        </div>
      </div>

      {/* Button area - stays at bottom */}
      <div class="flex space-x-2 mt-auto">
        <div class="flex-1 relative dropdown-container">
          {/* Main execute button */}
          <button
            onClick={handleExecute}
            disabled={
              isExecuting || executionId !== null || isExecutingGlobally
            }
            class="w-full pr-8 pl-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors"
          >
            {isExecuting || isExecutingGlobally || executionId ? (
              <>
                <span class="inline-block animate-pulse mr-2">🔄</span>
                Executing...
              </>
            ) : executionMode === 'configure' ? (
              '⚙️ Configure & Run'
            ) : (
              '▶️ Quick Run'
            )}
          </button>

          {/* Dropdown button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpenDropdown(showDropdown ? null : runbook.id)
            }}
            disabled={
              isExecuting || executionId !== null || isExecutingGlobally
            }
            class="absolute right-0 top-0 h-full w-8 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-r text-white text-xs transition-colors border-l border-blue-500 flex items-center justify-center"
          >
            ▼
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div
              class="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded shadow-lg z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleModeSelect('configure')
                }}
                class={`w-full px-3 py-2 text-left text-white text-sm rounded-t hover:bg-blue-700 text-white'
                }`}
              >
                ⚙️ Configure & Run
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleModeSelect('quick')
                }}
                class={`w-full px-3 py-2 text-left text-white text-sm rounded-b hover:bg-blue-700 text-white'
                }`}
              >
                ▶️ Quick Run
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onToggleFavorite}
          class={`px-3 py-2 ${
            isFavorite
              ? 'bg-yellow-600 hover:bg-yellow-700'
              : 'bg-slate-700 hover:bg-slate-600'
          } rounded text-white text-sm transition-colors`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '⭐' : '☆'}
        </button>
        <button
          onClick={() => onShowRunbookViewer(runbook)}
          class="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm"
          title="View runbook source"
        >
          📝
        </button>
      </div>
    </div>
  )
}
