import { Suspense } from 'hono/jsx'
import { createRoute } from 'honox/factory'
import { HistoryContent } from '../components/HistoryContent'
import { LoadingState } from '../components/LoadingState'

export default createRoute((c) => {
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
    </>,
  )
})
