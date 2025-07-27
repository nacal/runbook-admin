import { Suspense } from 'hono/jsx'
import { createRoute } from 'honox/factory'
import { DashboardContent } from '../components/DashboardContent'
import { LoadingState } from '../components/LoadingState'
import { getProjectPath } from '../utils/project-context'

export default createRoute((c) => {
  return c.render(
    <>
      <title>Dashboard - Runbook Admin</title>
      <header class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold text-white mb-2">🔥 Runbook Admin</h1>
            <p class="text-slate-400">
              Local GUI for running and managing Runn runbooks
            </p>
            <p class="mt-4 text-sm text-slate-500">📁 {getProjectPath()}</p>
          </div>
          <div class="flex space-x-3">
            <a
              href="/history"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm"
            >
              📋 History
            </a>
          </div>
        </div>
      </header>

      <main>
        <Suspense fallback={<LoadingState />}>
          <DashboardContent />
        </Suspense>
      </main>
    </>,
  )
})
