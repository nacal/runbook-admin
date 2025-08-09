import type { ExecutionOptions, Runbook } from '../types/types'
import { VariableInput } from './VariableInput'

interface VariableInputModalProps {
  runbook: Runbook
  backUrl: string
}

export function VariableInputModal({
  runbook,
  backUrl,
}: VariableInputModalProps) {
  const handleSubmit = async (
    variables: Record<string, string>,
    executionOptions?: ExecutionOptions,
  ) => {
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
        // Store executing runbook ID in session storage
        sessionStorage.setItem('executingRunbookId', runbook.id)
        sessionStorage.setItem('executingExecutionId', result.executionId)

        // Navigate back to dashboard with execution modal
        window.location.href = `/?execution=${result.executionId}`
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to execute runbook:', error)
      // Optionally show error to user
    }
  }

  const handleCancel = () => {
    window.location.href = backUrl
  }

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
            <VariableInput
              runbook={runbook}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </>
  )
}
