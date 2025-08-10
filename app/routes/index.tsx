import { Suspense } from 'hono/jsx'
import { createRoute } from 'honox/factory'
import { LoadingState } from '@/components/common/LoadingState'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { EnvironmentSettingsModal } from '@/components/environment/EnvironmentSettingsModal'
import { ExecutionModal } from '@/components/execution/ExecutionModal'
import { RunbookViewerModal } from '@/components/runbook/RunbookViewerModal'
import { VariableInputWrapper } from '@/components/runbook/VariableInputWrapper'
import { getProjectPath } from '@/utils/project-context'

export default createRoute((c) => {
  const executionId = c.req.query('execution')
  const variableInputId = c.req.query('variable-input')
  const runbookViewerId = c.req.query('runbook-viewer')
  const environmentSettings = c.req.query('environment-settings')
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

      {/* Execution Result Modal */}
      {executionId && (
        <Suspense
          fallback={
            <div class="fixed inset-0 z-50 flex items-center justify-center">
              <div class="absolute inset-0 bg-black/70" />
              <div class="relative bg-slate-900 border border-slate-700 rounded-lg p-8">
                <div class="flex items-center space-x-3">
                  <div class="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                  <div class="text-blue-400 font-medium">
                    Executing runbook...
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <ExecutionModal executionId={executionId} backUrl="/" />
        </Suspense>
      )}

      {/* Variable Input Modal */}
      {variableInputId && (
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
          <VariableInputWrapper runbookId={variableInputId} backUrl="/" />
        </Suspense>
      )}

      {/* Runbook Viewer Modal */}
      {runbookViewerId && (
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
          <RunbookViewerModal runbookId={runbookViewerId} backUrl="/" />
        </Suspense>
      )}

      {/* Environment Settings Modal */}
      {environmentSettings && (
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
          <EnvironmentSettingsModal backUrl="/" />
        </Suspense>
      )}
    </>,
  )
})
