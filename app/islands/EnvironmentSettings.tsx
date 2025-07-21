import { useEffect, useState } from 'hono/jsx'

interface EnvironmentVariable {
  key: string
  value: string
  description?: string
  isSecret?: boolean
  createdAt: Date
  updatedAt: Date
}

interface EnvironmentSettingsProps {
  onClose: () => void
}

export function EnvironmentSettings({ onClose }: EnvironmentSettingsProps) {
  const [variables, setVariables] = useState<EnvironmentVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [newVar, setNewVar] = useState({
    key: '',
    value: '',
    description: '',
    isSecret: false
  })
  const [editingVar, setEditingVar] = useState<string | null>(null)

  useEffect(() => {
    loadVariables()
    
    // Add ESC key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadVariables = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/environment')
      const result = await response.json()
      
      if (result.success) {
        setVariables(result.data)
      }
    } catch (error) {
      console.error('Failed to load environment variables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!newVar.key.trim()) return

    try {
      const response = await fetch('/api/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVar)
      })

      const result = await response.json()
      if (result.success) {
        setNewVar({ key: '', value: '', description: '', isSecret: false })
        loadVariables()
      } else {
        alert(`❌ Failed to save: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to save environment variable:', error)
      alert('❌ Failed to save environment variable')
    }
  }

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete environment variable "${key}"?`)) return

    try {
      const response = await fetch('/api/environment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      })

      const result = await response.json()
      if (result.success) {
        loadVariables()
      } else {
        alert(`❌ Failed to delete: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to delete environment variable:', error)
      alert('❌ Failed to delete environment variable')
    }
  }

  const handleEdit = async (variable: EnvironmentVariable) => {
    setEditingVar(variable.key)
    setNewVar({
      key: variable.key,
      value: variable.isSecret ? '' : variable.value,
      description: variable.description || '',
      isSecret: variable.isSecret || false
    })
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString()
  }

  return (
    <div class="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-full p-4">
        <div class="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full" style="max-height: calc(100vh - 2rem);">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-slate-700">
            <div>
              <h2 class="text-xl font-semibold text-white">🌍 Environment Variables</h2>
              <p class="text-sm text-slate-400 mt-1">
                Manage persistent environment variables for runbook execution
              </p>
            </div>
            <button
              onClick={onClose}
              class="text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-auto p-6">
            {/* Add/Edit Form */}
            <div class="mb-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
              <h3 class="text-lg font-medium text-white mb-4">
                {editingVar ? `Edit ${editingVar}` : 'Add Environment Variable'}
              </h3>
              <div class="grid gap-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">
                      Variable Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., API_TOKEN, DATABASE_URL"
                      value={newVar.key}
                      onInput={(e) => setNewVar(prev => ({ ...prev, key: (e.target as HTMLInputElement)?.value || '' }))}
                      disabled={!!editingVar}
                      class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">
                      Value *
                    </label>
                    <input
                      type={newVar.isSecret ? 'password' : 'text'}
                      placeholder="Variable value"
                      value={newVar.value}
                      onInput={(e) => setNewVar(prev => ({ ...prev, value: (e.target as HTMLInputElement)?.value || '' }))}
                      class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={newVar.description}
                    onInput={(e) => setNewVar(prev => ({ ...prev, description: (e.target as HTMLInputElement)?.value || '' }))}
                    class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="isSecret"
                    checked={newVar.isSecret}
                    onChange={(e) => setNewVar(prev => ({ ...prev, isSecret: (e.target as HTMLInputElement)?.checked || false }))}
                    class="mr-2"
                  />
                  <label for="isSecret" class="text-sm text-slate-300">
                    🔒 Secret (value will be masked in the UI)
                  </label>
                </div>
                <div class="flex space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={!newVar.key.trim() || !newVar.value.trim()}
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-white font-medium"
                  >
                    {editingVar ? 'Update' : 'Add'} Variable
                  </button>
                  {editingVar && (
                    <button
                      onClick={() => {
                        setEditingVar(null)
                        setNewVar({ key: '', value: '', description: '', isSecret: false })
                      }}
                      class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-slate-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Variables List */}
            <div>
              <h3 class="text-lg font-medium text-white mb-4">Current Variables ({variables.length})</h3>
              {loading ? (
                <div class="flex items-center justify-center py-8">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span class="ml-3 text-slate-400">Loading...</span>
                </div>
              ) : variables.length === 0 ? (
                <div class="text-center py-8 text-slate-400">
                  No environment variables configured
                </div>
              ) : (
                <div class="space-y-3">
                  {variables.map((variable) => (
                    <div key={variable.key} class="p-4 bg-slate-900/30 border border-slate-700 rounded-lg">
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <div class="flex items-center space-x-2">
                            <span class="font-mono text-blue-400 font-medium">{variable.key}</span>
                            {variable.isSecret && <span class="text-yellow-500 text-sm">🔒</span>}
                          </div>
                          <div class="mt-1 font-mono text-sm text-slate-300 break-all">
                            {variable.value}
                          </div>
                          {variable.description && (
                            <div class="mt-2 text-sm text-slate-400">
                              {variable.description}
                            </div>
                          )}
                          <div class="mt-2 text-xs text-slate-500">
                            Updated: {formatDate(variable.updatedAt)}
                          </div>
                        </div>
                        <div class="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleEdit(variable)}
                            class="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(variable.key)}
                            class="px-3 py-1 text-sm bg-red-700 hover:bg-red-600 rounded text-white"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div class="p-6 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400">
            <div>
              Press <kbd class="px-2 py-1 bg-slate-700 rounded text-xs">ESC</kbd> to close
            </div>
            <div>
              Variables are stored in ~/.runbook-admin/environment.json
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}