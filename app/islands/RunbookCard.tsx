import { useEffect, useState } from 'hono/jsx'
import type { Runbook } from '../types/types'

interface RunbookCardProps {
  runbook: Runbook
  isFavorite: boolean
  onToggleFavorite: () => void
  onShowResult: (id: string) => void
  onShowVariableInput: (runbook: Runbook) => void
  onShowRunbookViewer: (runbook: Runbook) => void
  openDropdown: string | null
  setOpenDropdown: (id: string | null) => void
  isExecutingGlobally: boolean
  onShowError: (message: string) => void
  selectedLabels: string[]
  setSelectedLabels: (labels: string[] | ((prev: string[]) => string[])) => void
}

export function RunbookCard({
  runbook,
  isFavorite,
  onToggleFavorite,
  onShowResult,
  onShowVariableInput,
  onShowRunbookViewer,
  openDropdown,
  setOpenDropdown,
  isExecutingGlobally,
  onShowError,
  selectedLabels,
  setSelectedLabels,
}: RunbookCardProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionId, setExecutionId] = useState<string | null>(null)

  // Check if runbook has required variables or file type variables
  const hasRequiredVariables = Object.values(runbook.variables).some(
    (variable) =>
      variable.required || variable.type === 'file' || variable.type === 'json',
  )

  const [executionMode, setExecutionMode] = useState<'quick' | 'configure'>(
    hasRequiredVariables ? 'configure' : 'quick',
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
        onShowError(`Failed to execute: ${result.error}`)
      }
    } catch (error) {
      onShowError(`Failed to execute ${runbook.name}: ${error}`)
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
        if (result.data.status === 'running' && result.isRunning) {
          setTimeout(() => pollExecutionStatus(execId), 1000)
        } else {
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
        <div class="flex items-start justify-between mb-3 gap-2">
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-white truncate">{runbook.name}</h3>
          </div>
          <span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 flex-shrink-0">
            {runbook.steps} steps
          </span>
        </div>

        {runbook.description && (
          <p
            class="text-sm text-slate-400 mb-3 overflow-hidden"
            style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;"
          >
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
                <button
                  key={label}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!selectedLabels.includes(label)) {
                      setSelectedLabels((prev) => [...prev, label])
                    }
                  }}
                  class={`text-xs px-2 py-1 rounded transition-colors ${
                    selectedLabels.includes(label)
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                  }`}
                  title={`Filter by ${label}`}
                >
                  {label}
                </button>
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
          onClick={() => onShowRunbookViewer(runbook)}
          class="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm"
          title="View runbook source"
        >
          📝
        </button>
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
      </div>
    </div>
  )
}
