import { Suspense } from 'hono/jsx'
import { createRoute } from 'honox/factory'
import { ExecutionModal } from '../components/ExecutionModal'
import { HistoryContent } from '../components/HistoryContent'
import { LoadingState } from '../components/LoadingState'

export default createRoute((c) => {
  const executionId = c.req.query('execution')
  return c.render(
    <>
      <title>Execution History - Runbook Admin</title>
      <header class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-white mb-2">
              Execution History
            </h1>
            <p class="text-slate-400">View all runbook execution results</p>
          </div>
          <a
            href="/"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
          >
            ← Back to Runbooks
          </a>
        </div>
      </header>

      <main>
        <Suspense fallback={<LoadingState />}>
          <HistoryContent />
        </Suspense>
      </main>

      {/* Execution Result Modal */}
      {executionId && (
        <Suspense
          fallback={
            <div class="fixed inset-0 z-50 flex items-center justify-center">
              <div class="absolute inset-0 bg-black/70" />
              <div class="relative bg-slate-900 border border-slate-700 rounded-lg p-8">
                <LoadingState />
              </div>
            </div>
          }
        >
          <ExecutionModal executionId={executionId} backUrl="/history" />
        </Suspense>
      )}
    </>,
  )
})
