import { createRoute } from 'honox/factory'
import { RunbookList } from '../islands/RunbookList'

export default createRoute((c) => {
  return c.render(
    <div>
      <title>Dashboard - Runbook Admin</title>
      <header class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold text-white mb-2">
              🔥 Runbook Admin
            </h1>
            <p class="text-slate-400">
              Local GUI for running and managing Runn runbooks
            </p>
            <div class="mt-4 flex items-center space-x-4 text-sm text-slate-500">
              <span>📁 {process.cwd()}</span>
              <span>•</span>
              <span>⚡ Scanning for runbooks...</span>
            </div>
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
        <RunbookList />
      </main>

      <footer class="mt-12 text-center text-slate-600 text-sm">
        <p>
          Powered by <strong>HonoX</strong> + <strong>Runn</strong>
        </p>
      </footer>
    </div>
  )
})