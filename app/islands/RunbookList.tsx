import { useEffect, useState } from 'hono/jsx'
import type { ExecutionOptions } from '../services/execution-options-manager'
import type { Runbook } from '../types/types'
import { EnvironmentSettings } from './EnvironmentSettings'
import { ExecutionResultModal } from './ExecutionResult'
import { RunbookViewer } from '../components/RunbookViewer'
import { VariableInput } from './VariableInput'
import { Toast, useToast } from './Toast'
import { SearchBar } from '../components/SearchBar'
import { LabelFilter } from '../components/LabelFilter'
import { StatsBar } from '../components/StatsBar'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { EmptyState } from '../components/EmptyState'
import { RunbookGrid } from '../components/RunbookGrid'

export function RunbookList() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [availableLabels, setAvailableLabels] = useState<string[]>([])
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
  const { toasts, showError, removeToast } = useToast()

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
        
        // Extract all unique labels from runbooks
        const allLabels = new Set<string>()
        result.data.forEach((runbook: Runbook) => {
          if (runbook.labels) {
            runbook.labels.forEach((label: string) => {
              allLabels.add(label)
            })
          }
        })
        setAvailableLabels(Array.from(allLabels).sort())
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
    setSelectedLabels(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    )
  }

  const clearAllLabels = () => {
    setSelectedLabels([])
  }

  const filteredRunbooks = runbooks.filter((runbook) => {
    // Text search filter
    const matchesSearch = !searchTerm || 
      runbook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      runbook.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      runbook.path.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Label filter
    const matchesLabels = selectedLabels.length === 0 || 
      (runbook.labels && selectedLabels.every(label => runbook.labels!.includes(label)))
    
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

  const handleRefresh = () => {
    loadRunbooks()
    loadFavorites()
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadRunbooks} />
  }

  return (
    <div>
      {/* Search Bar */}
      <SearchBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

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
        onRefresh={handleRefresh}
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