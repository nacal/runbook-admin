export function LoadingState() {
  return (
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-3 text-slate-400">Scanning runbooks...</span>
    </div>
  )
}
