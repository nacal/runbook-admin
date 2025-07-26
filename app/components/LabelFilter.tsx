interface LabelFilterProps {
  availableLabels: string[]
  selectedLabels: string[]
  onToggleLabel: (label: string) => void
  onClearAll: () => void
}

export function LabelFilter({
  availableLabels,
  selectedLabels,
  onToggleLabel,
  onClearAll,
}: LabelFilterProps) {
  if (availableLabels.length === 0) {
    return null
  }

  return (
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-slate-400 text-sm font-medium">Filter by labels</h4>
        {selectedLabels.length > 0 && (
          <button
            onClick={onClearAll}
            class="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      <div class="flex flex-wrap gap-2">
        {availableLabels.map((label) => (
          <button
            key={label}
            onClick={() => onToggleLabel(label)}
            class={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedLabels.includes(label)
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {selectedLabels.length > 0 && (
        <div class="mt-2 text-xs text-slate-500">
          Active filters: {selectedLabels.join(', ')}
        </div>
      )}
    </div>
  )
}
