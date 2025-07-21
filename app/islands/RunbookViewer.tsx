import { useEffect, useState } from 'hono/jsx'

interface RunbookViewerProps {
  path: string
  name: string
  onClose: () => void
}

export function RunbookViewer({ path, name, onClose }: RunbookViewerProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lines, setLines] = useState(0)

  useEffect(() => {
    loadContent()
    
    // Add ESC key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [path])

  const loadContent = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/runbook-content?path=${encodeURIComponent(path)}`)
      const result = await response.json()

      if (result.success) {
        setContent(result.data.content)
        setLines(result.data.lines)
      } else {
        setError(result.error || 'Failed to load runbook')
        console.error('API error:', result)
      }
    } catch (err) {
      setError('Failed to load runbook content')
      console.error('Failed to load runbook:', err)
      console.error('Path:', path)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      alert('✅ Copied to clipboard!')
    } catch (err) {
      alert('❌ Failed to copy to clipboard')
    }
  }

  return (
    <div class="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-full p-4">
        <div class="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full flex flex-col" style="max-height: calc(100vh - 2rem);">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h3 class="text-lg font-semibold text-white">📄 {name}</h3>
            <p class="text-sm text-slate-400">
              {path} • {lines} lines
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
            >
              📋 Copy
            </button>
            <button
              onClick={onClose}
              class="text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div class="flex-1 overflow-auto">
          {loading ? (
            <div class="flex items-center justify-center p-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span class="ml-3 text-slate-400">Loading runbook...</span>
            </div>
          ) : error ? (
            <div class="flex items-center justify-center p-8">
              <div class="text-center">
                <div class="text-red-400 text-xl mb-2">❌</div>
                <p class="text-red-400">{error}</p>
                <button
                  onClick={loadContent}
                  class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <pre class="p-4 text-sm font-mono overflow-x-auto">
              <code class="language-yaml text-slate-300 whitespace-pre">{content}</code>
            </pre>
          )}
        </div>

        {/* Footer */}
        <div class="p-4 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400">
          <div>
            Press <kbd class="px-2 py-1 bg-slate-700 rounded text-xs">ESC</kbd> to close
          </div>
          <div>
            YAML syntax • UTF-8
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}