import { useState } from 'hono/jsx'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LabelFilter } from '../components/LabelFilter'
import { RunbookGrid } from '../components/RunbookGrid'
import { RunbookViewer } from '../components/RunbookViewer'
import { SearchBar } from '../components/SearchBar'
import { StatsBar } from '../components/StatsBar'
import type { ExecutionOptions } from '../services/execution-options-manager'
import type { Runbook } from '../types/types'
import { EnvironmentSettings } from './EnvironmentSettings'
import { ExecutionResultModal } from './ExecutionResult'
import { Toast, useToast } from './Toast'
import { VariableInput } from './VariableInput'

interface RunbookListProps {
  runbooks: Runbook[]
  favorites: string[]
  availableLabels: string[]
  error: string | null
}

export function RunbookList({
  runbooks,
  favorites: initialFavorites,
  availableLabels,
  error,
}: RunbookListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [showExecutionResult, setShowExecutionResult] = useState<string | null>(
    null,
  )
  const [favorites, setFavorites] = useState<string[]>(initialFavorites)
  const [showVariableInput, setShowVariableInput] = useState<Runbook | null>(
    null,
  )
  const [showRunbookViewer, setShowRunbookViewer] = useState<Runbook | null>(
    null,
  )
  const [showEnvironmentSettings, setShowEnvironmentSettings] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [executingRunbooks, setExecutingRunbooks] = useState<Set<string>>(
    new Set(),
  )
  const { toasts, showError, removeToast } = useToast()

  const executeRunbook = async (
    runbook: Runbook,
    variables: Record<string, string>,
    executionOptions?: ExecutionOptions,
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
        showError(`Failed to execute: ${result.error}`)
      }
    } catch (error) {
      // Remove from executing set on error
      setExecutingRunbooks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(runbook.id)
        return newSet
      })
      showError(`Failed to execute ${runbook.name}: ${error}`)
    }
  }

  const pollExecutionStatus = async (execId: string, runbookId?: string) => {
    try {
      const response = await fetch(`/api/executions/${execId}`)
      const result = await response.json()

      if (result.success) {
        if (result.data.status === 'running' && result.isRunning) {
          setTimeout(() => pollExecutionStatus(execId, runbookId), 1000)
        } else {
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
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runbookId }),
      })

      const result = await response.json()

      if (result.success) {
        if (result.isFavorite) {
          const newFavorites = [...favorites, runbookId]
          setFavorites(newFavorites)
        } else {
          const newFavorites = favorites.filter((id) => id !== runbookId)
          setFavorites(newFavorites)
        }
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  const clearAllLabels = () => {
    setSelectedLabels([])
  }

  const filteredRunbooks = runbooks.filter((runbook) => {
    // Text search filter
    const matchesSearch =
      !searchTerm ||
      runbook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      runbook.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      runbook.path.toLowerCase().includes(searchTerm.toLowerCase())

    // Label filter
    const matchesLabels =
      selectedLabels.length === 0 ||
      (runbook.labels &&
        selectedLabels.every((label) => runbook.labels!.includes(label)))

    return matchesSearch && matchesLabels
  })

  // Sort runbooks: favorites first, then by name
  const sortedRunbooks = [...filteredRunbooks].sort((a, b) => {
    const aIsFavorite = favorites.includes(a.id)
    const bIsFavorite = favorites.includes(b.id)

    if (aIsFavorite && !bIsFavorite) return -1
    if (!aIsFavorite && bIsFavorite) return 1
    return a.name.localeCompare(b.name)
  })

  if (error) {
    return <ErrorState error={error} />
  }

  return (
    <div>
      {/* Search Bar */}
      <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* Label Filter */}
      <LabelFilter
        availableLabels={availableLabels}
        selectedLabels={selectedLabels}
        onToggleLabel={toggleLabel}
        onClearAll={clearAllLabels}
      />

      {/* Stats */}
      <StatsBar
        filteredCount={filteredRunbooks.length}
        searchTerm={searchTerm}
        selectedLabels={selectedLabels}
        favoritesCount={favorites.length}
        onShowEnvironmentSettings={() => setShowEnvironmentSettings(true)}
      />

      {/* Runbook Grid */}
      {filteredRunbooks.length === 0 ? (
        <EmptyState searchTerm={searchTerm} />
      ) : (
        <RunbookGrid
          runbooks={sortedRunbooks}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onShowResult={setShowExecutionResult}
          onShowVariableInput={setShowVariableInput}
          onShowRunbookViewer={setShowRunbookViewer}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          executingRunbooks={executingRunbooks}
          onShowError={showError}
          selectedLabels={selectedLabels}
          setSelectedLabels={setSelectedLabels}
        />
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

      {/* Toast Notifications */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  )
}
