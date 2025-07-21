interface ErrorStateProps {
  error: string
  onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
      <h3 class="text-red-400 font-semibold mb-2">Error Loading Runbooks</h3>
      <p class="text-red-300">{error}</p>
      <button
        onClick={onRetry}
        class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
      >
        Retry
      </button>
    </div>
  )
}