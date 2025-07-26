interface EmptyStateProps {
  searchTerm: string
}

export function EmptyState({ searchTerm }: EmptyStateProps) {
  return (
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
  )
}
