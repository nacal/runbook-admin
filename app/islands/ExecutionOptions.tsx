import { useEffect, useState } from 'hono/jsx'
import type { ExecutionOptions, ExecutionPreset } from '../services/execution-options-manager'

interface ExecutionOptionsProps {
  onClose: () => void
  onApply: (options: ExecutionOptions) => void
  currentOptions?: ExecutionOptions
}

export function ExecutionOptions({ onClose, onApply, currentOptions = { args: [] } }: ExecutionOptionsProps) {
  const [options, setOptions] = useState<ExecutionOptions>(currentOptions)
  const [presets, setPresets] = useState<ExecutionPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [newPresetName, setNewPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [argsText, setArgsText] = useState(currentOptions.args?.join(' ') || '')

  useEffect(() => {
    loadPresets()
    
    // Add ESC key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadPresets = async () => {
    try {
      const response = await fetch('/api/execution/presets')
      const result = await response.json()
      if (result.success) {
        setPresets(result.data)
      }
    } catch (error) {
      console.error('Failed to load execution presets:', error)
    }
  }

  const handlePresetChange = async (presetName: string) => {
    setSelectedPreset(presetName)
    
    if (presetName) {
      try {
        const response = await fetch(`/api/execution/presets/${presetName}`)
        const result = await response.json()
        if (result.success) {
          setOptions(result.data.options)
          setArgsText(result.data.options.args?.join(' ') || '')
        }
      } catch (error) {
        console.error('Failed to load preset:', error)
      }
    } else {
      setOptions({ args: [] })
      setArgsText('')
    }
  }

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return

    try {
      const response = await fetch('/api/execution/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPresetName,
          options,
          description: `Execution options preset`
        })
      })

      const result = await response.json()
      if (result.success) {
        setNewPresetName('')
        setShowSavePreset(false)
        loadPresets()
        alert(`✅ Preset '${newPresetName}' saved successfully`)
      } else {
        alert(`❌ Failed to save preset: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to save preset:', error)
      alert('❌ Failed to save preset')
    }
  }

  const handleArgsChange = (text: string) => {
    setArgsText(text)
    // Parse the text into arguments (simple space-based splitting for now)
    const args = text.trim() ? text.trim().split(/\s+/) : []
    setOptions({ args })
  }

  const renderOptionsInput = () => (
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">
          Command Line Arguments
        </label>
        <textarea
          placeholder="Enter runn command line arguments (e.g., --debug --verbose --concurrent on --format json)"
          value={argsText}
          onInput={(e) => handleArgsChange((e.target as HTMLTextAreaElement)?.value || '')}
          rows={6}
          class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none font-mono text-sm"
        />
        <div class="mt-2 text-xs text-slate-400">
          <p>Example arguments:</p>
          <div class="mt-1 font-mono text-slate-500">
            <div>--debug --verbose</div>
            <div>--concurrent on --shuffle on</div>
            <div>--format json --profile</div>
            <div>--fail-fast --skip-test</div>
            <div>--wait-timeout 30sec</div>
          </div>
        </div>
      </div>
      
      {argsText && (
        <div class="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
          <div class="text-sm text-slate-300 mb-2">Preview command:</div>
          <div class="font-mono text-sm text-green-400">
            runn run [runbook] {argsText}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div class="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-full p-4">
        <div class="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[calc(100vh-2rem)] flex flex-col">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
            <div>
              <h2 class="text-xl font-semibold text-white">⚙️ Execution Options</h2>
              <p class="text-sm text-slate-400 mt-1">
                Configure runn execution options and save as presets
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
          <div class="flex-1 overflow-y-auto p-6">
            {/* Preset Selection */}
            <div class="mb-6">
              <label class="block text-sm font-medium text-white mb-2">
                🎯 Execution Preset
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange((e.target as HTMLSelectElement)?.value || '')}
                class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 outline-none"
              >
                <option value="">No preset (custom options)</option>
                {presets.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name} {preset.description && `- ${preset.description}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Options Input */}
            <div class="mb-6">
              {renderOptionsInput()}
            </div>

            {/* Save as Preset */}
            <div class="mb-6">
              {!showSavePreset ? (
                <button
                  onClick={() => setShowSavePreset(true)}
                  class="text-sm text-blue-400 hover:text-blue-300"
                >
                  💾 Save current options as preset
                </button>
              ) : (
                <div class="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Preset name..."
                    value={newPresetName}
                    onInput={(e) => setNewPresetName((e.target as HTMLInputElement)?.value || '')}
                    class="flex-1 px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!newPresetName.trim()}
                    class="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowSavePreset(false)
                      setNewPresetName('')
                    }}
                    class="px-3 py-2 text-sm bg-slate-600 hover:bg-slate-500 rounded text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div class="p-6 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
            <div class="text-sm text-slate-400">
              Press <kbd class="px-2 py-1 bg-slate-700 rounded text-xs">ESC</kbd> to close
            </div>
            <div class="flex space-x-3">
              <button
                onClick={onClose}
                class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => onApply(options)}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium"
              >
                Apply Options
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}