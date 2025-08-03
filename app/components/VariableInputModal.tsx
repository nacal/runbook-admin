import { VariableInput } from '../islands/VariableInput'
import { FileScanner } from '../services/file-scanner'
import type { Runbook } from '../types/types'
import { getProjectPath } from '../utils/project-context'

interface VariableInputModalProps {
  runbookId: string
  backUrl: string
}

async function getRunbookData(runbookId: string): Promise<{
  runbook: Runbook | null
  error: string | null
}> {
  try {
    const projectPath = getProjectPath()
    const scanner = new FileScanner(projectPath)
    const runbooks = await scanner.scanRunbooks()

    const runbook = runbooks.find((r) => r.id === runbookId)

    if (!runbook) {
      return {
        runbook: null,
        error: 'Runbook not found',
      }
    }

    return {
      runbook,
      error: null,
    }
  } catch (err) {
    return {
      runbook: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    }
  }
}

export async function VariableInputModal({
  runbookId,
  backUrl,
}: VariableInputModalProps) {
  const { runbook, error } = await getRunbookData(runbookId)

  return (
    <>
      {/* Prevent body scroll */}
      <style>{`
        body {
          overflow: hidden;
          padding-right: 0px;
        }
      `}</style>

      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div class="absolute inset-0 bg-black/70" />

        {/* Modal */}
        <div class="relative bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 class="text-xl font-bold text-white">Configure & Run</h2>
            <a
              href={backUrl}
              class="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Close"
            >
              <svg
                class="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Close</title>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </a>
          </div>

          {/* Content */}
          <div class="max-h-[calc(90vh-80px)] overflow-y-auto">
            {error ? (
              <div class="p-6">
                <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
                  <h3 class="text-red-400 font-semibold mb-2">
                    Error Loading Runbook
                  </h3>
                  <p class="text-red-300">{error}</p>
                </div>
              </div>
            ) : runbook ? (
              <VariableInput
                runbook={runbook}
                onSubmit={async (variables, executionOptions) => {
                  try {
                    const response = await fetch('/api/execute', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        runbookPath: runbook.path,
                        variables: variables,
                        executionOptions: executionOptions,
                      }),
                    })

                    const result = await response.json()

                    if (result.success) {
                      // Navigate to execution result modal
                      window.location.href = `/?execution=${result.executionId}`
                    } else {
                      throw new Error(result.error || 'Unknown error')
                    }
                  } catch (error) {
                    console.error('Failed to execute runbook:', error)
                    // Optionally show error to user
                  }
                }}
                onCancel={() => {
                  window.location.href = backUrl
                }}
              />
            ) : (
              <div class="p-6 text-center py-12">
                <div class="text-slate-400">Loading...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
