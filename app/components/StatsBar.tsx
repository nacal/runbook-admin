interface StatsBarProps {
  filteredCount: number
  searchTerm: string
  selectedLabels: string[]
  favoritesCount: number
  onShowEnvironmentSettings: () => void
}

export function StatsBar({
  filteredCount,
  searchTerm,
  selectedLabels,
  favoritesCount,
  onShowEnvironmentSettings,
}: StatsBarProps) {
  return (
    <div class="mb-6 flex items-center justify-between">
      <div class="text-slate-400">
        Found{' '}
        <span class="text-white font-semibold">
          {filteredCount}
        </span>{' '}
        runbooks
        {searchTerm && <span> matching "{searchTerm}"</span>}
        {selectedLabels.length > 0 && <span> with labels [{selectedLabels.join(', ')}]</span>}
        {favoritesCount > 0 && (
          <span class="ml-3">
            <span class="text-yellow-500">⭐</span> {favoritesCount}{' '}
            favorites
          </span>
        )}
      </div>
      <div class="flex space-x-2">
        <button
          onClick={onShowEnvironmentSettings}
          class="px-3 py-1 text-sm bg-green-700 hover:bg-green-600 rounded text-white"
          title="Manage Environment Variables"
        >
          🌍 Environment
        </button>
      </div>
    </div>
  )
}