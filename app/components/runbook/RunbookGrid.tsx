import { RunbookCard } from '@/islands/RunbookCard'
import type { Runbook } from '@/types/types'

interface RunbookGridProps {
  runbooks: Runbook[]
  favorites: string[]
  onToggleFavorite: (runbookId: string) => void
  onShowResult: (id: string) => void
  onShowVariableInput: (runbook: Runbook) => void
  onShowRunbookViewer: (runbook: Runbook) => void
  openDropdown: string | null
  setOpenDropdown: (id: string | null) => void
  executingRunbooks: Set<string>
  onShowError: (message: string) => void
  selectedLabels: string[]
  setSelectedLabels: (labels: string[] | ((prev: string[]) => string[])) => void
}

export function RunbookGrid({
  runbooks,
  favorites,
  onToggleFavorite,
  onShowResult,
  onShowVariableInput,
  onShowRunbookViewer,
  openDropdown,
  setOpenDropdown,
  executingRunbooks,
  onShowError,
  selectedLabels,
  setSelectedLabels,
}: RunbookGridProps) {
  return (
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
      {runbooks.map((runbook) => (
        <RunbookCard
          key={runbook.id}
          runbook={runbook}
          isFavorite={favorites.includes(runbook.id)}
          onToggleFavorite={() => onToggleFavorite(runbook.id)}
          onShowResult={onShowResult}
          onShowVariableInput={onShowVariableInput}
          onShowRunbookViewer={onShowRunbookViewer}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          isExecutingGlobally={executingRunbooks.has(runbook.id)}
          onShowError={onShowError}
          selectedLabels={selectedLabels}
          setSelectedLabels={setSelectedLabels}
        />
      ))}
    </div>
  )
}
