import { VariableInputModal } from '@/islands/VariableInputModal'
import { FileScanner } from '@/services/file-scanner'
import { getProjectPath } from '@/utils/project-context'

interface VariableInputWrapperProps {
  runbookId: string
  backUrl: string
}

export async function VariableInputWrapper({
  runbookId,
  backUrl,
}: VariableInputWrapperProps) {
  try {
    const projectPath = getProjectPath()
    const scanner = new FileScanner(projectPath)
    const runbooks = await scanner.scanRunbooks()
    const runbook = runbooks.find((r) => r.id === runbookId)

    if (!runbook) {
      return (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/70" />
          <div class="relative bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h3 class="text-red-400 font-semibold mb-2">Runbook not found</h3>
            <a href={backUrl} class="text-blue-400 hover:underline">
              Go back
            </a>
          </div>
        </div>
      )
    }

    return <VariableInputModal runbook={runbook} backUrl={backUrl} />
  } catch (error) {
    return (
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70" />
        <div class="relative bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h3 class="text-red-400 font-semibold mb-2">Error loading runbook</h3>
          <p class="text-red-300">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <a href={backUrl} class="text-blue-400 hover:underline">
            Go back
          </a>
        </div>
      </div>
    )
  }
}
