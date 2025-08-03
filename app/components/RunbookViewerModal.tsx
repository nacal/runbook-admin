import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHighlighter } from 'shiki'
import { FileScanner } from '../services/file-scanner'
import type { Runbook } from '../types/types'
import { getProjectPath } from '../utils/project-context'

interface RunbookViewerModalProps {
  runbookId: string
  backUrl: string
}

// Cache highlighter instance for performance
let highlighterCache: Awaited<ReturnType<typeof createHighlighter>> | null =
  null

async function getHighlighterInstance() {
  if (!highlighterCache) {
    highlighterCache = await createHighlighter({
      themes: ['github-dark'],
      langs: ['yaml'],
    })
  }
  return highlighterCache
}

async function highlightYaml(content: string): Promise<string> {
  try {
    const highlighter = await getHighlighterInstance()

    return highlighter.codeToHtml(content, {
      lang: 'yaml',
      theme: 'github-dark',
    })
  } catch (err) {
    console.error('[RunbookViewerModal] Failed to highlight with Shiki:', err)
    return content
  }
}

async function getRunbookData(runbookId: string): Promise<{
  runbook: Runbook | null
  content: string | null
  highlightedContent: string | null
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
        content: null,
        highlightedContent: null,
        error: 'Runbook not found',
      }
    }

    // Read file content using absolute path
    const absolutePath = path.isAbsolute(runbook.path)
      ? runbook.path
      : path.resolve(projectPath, runbook.path)
    const content = await fs.readFile(absolutePath, 'utf-8')

    // Apply server-side syntax highlighting
    const highlightedContent = await highlightYaml(content)

    return {
      runbook,
      content,
      highlightedContent,
      error: null,
    }
  } catch (err) {
    return {
      runbook: null,
      content: null,
      highlightedContent: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    }
  }
}

export async function RunbookViewerModal({
  runbookId,
  backUrl,
}: RunbookViewerModalProps) {
  const { runbook, content, highlightedContent, error } =
    await getRunbookData(runbookId)

  return (
    <>
      {/* Prevent body scroll */}
      <style>{`
        body {
          overflow: hidden;
          padding-right: 0px;
        }
        
        /* Shiki styling adjustments */
        .shiki-container pre {
          margin: 0;
          padding: 1rem;
          font-size: 0.875rem;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
          overflow-x: auto;
          background: transparent !important;
        }
        
        .shiki-container code {
          white-space: pre;
        }
      `}</style>

      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div class="absolute inset-0 bg-black/70" />

        {/* Modal */}
        <div class="relative bg-slate-900 border border-slate-700 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 class="text-xl font-bold text-white">Runbook Viewer</h2>
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
            ) : runbook && content ? (
              <div class="p-6">
                {/* Header */}
                <div class="flex items-center justify-between mb-4 border-b border-slate-700 pb-4">
                  <div>
                    <h3 class="text-lg font-semibold text-white">
                      📄 {runbook.name}
                    </h3>
                    <p class="text-sm text-slate-400">
                      {runbook.path} • {content.split('\n').length} lines
                    </p>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button
                      type="button"
                      onclick={`navigator.clipboard.writeText(${JSON.stringify(content)})`}
                      class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div class="flex-1 overflow-auto">
                  {highlightedContent && highlightedContent !== content ? (
                    <div
                      class="shiki-container overflow-x-auto"
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: Server-side syntax highlighting requires raw HTML injection for Shiki
                      dangerouslySetInnerHTML={{ __html: highlightedContent }}
                    />
                  ) : (
                    <pre class="p-4 text-sm font-mono overflow-x-auto text-slate-300 whitespace-pre">
                      {content}
                    </pre>
                  )}
                </div>

                {/* Footer */}
                <div class="pt-4 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400">
                  <div>
                    YAML syntax • UTF-8 •{' '}
                    {highlightedContent && highlightedContent !== content
                      ? 'Shiki highlighted'
                      : 'Plain text'}
                  </div>
                </div>
              </div>
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
