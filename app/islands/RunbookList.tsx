import { useState } from 'hono/jsx'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LabelFilter } from '../components/LabelFilter'
import { RunbookGrid } from '../components/RunbookGrid'
import { SearchBar } from '../components/SearchBar'
import { StatsBar } from '../components/StatsBar'
import type { Runbook } from '../types/types'
import { Toast, useToast } from './Toast'

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
  const [favorites, setFavorites] = useState<string[]>(initialFavorites)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [executingRunbooks] = useState<Set<string>>(new Set())
  const { toasts, showError, removeToast } = useToast()

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
        selectedLabels.every((label) => runbook.labels?.includes(label)))

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
        onShowEnvironmentSettings={() => {
          window.location.href = '/?environment-settings=true'
        }}
      />

      {/* Runbook Grid */}
      {filteredRunbooks.length === 0 ? (
        <EmptyState searchTerm={searchTerm} />
      ) : (
        <RunbookGrid
          runbooks={sortedRunbooks}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onShowResult={() => {}}
          onShowVariableInput={(runbook) => {
            window.location.href = `/?variable-input=${runbook.id}`
          }}
          onShowRunbookViewer={(runbook) => {
            window.location.href = `/?runbook-viewer=${runbook.id}`
          }}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          executingRunbooks={executingRunbooks}
          onShowError={showError}
          selectedLabels={selectedLabels}
          setSelectedLabels={setSelectedLabels}
        />
      )}

      {/* Toast Notifications */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  )
}
