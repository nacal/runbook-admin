import { useEffect, useState } from 'hono/jsx'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import type {
  ExecutionOptions as ExecutionOptionsType,
  Runbook,
  RunbookVariable,
} from '../types/types'
import { FileUpload } from './FileUpload'
import { Toast, useToast } from './Toast'

export interface VariablePreset {
  name: string
  description?: string
  variables: Record<string, string>
  executionOptions?: ExecutionOptionsType
  createdAt: Date
  lastUsed?: Date
}

interface VariableInputProps {
  runbook: Runbook
  onSubmit: (
    variables: Record<string, string>,
    executionOptions?: ExecutionOptionsType,
  ) => void
  onCancel: () => void
}

export function VariableInput({
  runbook,
  onSubmit,
  onCancel,
}: VariableInputProps) {
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [presets, setPresets] = useState<VariablePreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [newPresetName, setNewPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)

  // モーダル表示時にスクロールを無効化
  useBodyScrollLock(true)
  const [globalVariables, setGlobalVariables] = useState<
    Record<string, string>
  >({})
  const [environmentVariables, setEnvironmentVariables] = useState<
    Record<string, string>
  >({})
  const [executionOptions, setExecutionOptions] =
    useState<ExecutionOptionsType>({ args: [] })
  const { toasts, showSuccess, showError, removeToast } = useToast()

  useEffect(() => {
    initializeData()
  }, [])

  const initializeData = async () => {
    try {
      const response = await fetch(
        `/api/variables/initialize?runbookId=${runbook.id}`,
      )
      const result = await response.json()

      if (result.success) {
        const { presets, globalVariables, environmentVariables } = result.data

        // Set all data from the unified API
        setPresets(presets)
        setGlobalVariables(globalVariables)

        // Process environment variables with masking
        const processedEnvVars: Record<string, string> = {}
        Object.entries(environmentVariables).forEach(([key, value]) => {
          // Environment variables from API are already processed
          processedEnvVars[key] = String(value)
        })
        setEnvironmentVariables(processedEnvVars)

        // Initialize variables with the loaded data
        const initialVars: Record<string, string> = {}

        // Priority order: Environment Variables > Global Variables > Runbook Defaults
        Object.entries(runbook.variables).forEach(([key, variable]) => {
          // First check environment variables
          if (processedEnvVars?.[key]) {
            initialVars[key] = processedEnvVars[key]
          }
          // Then check global variables
          else if (globalVariables?.[key]) {
            initialVars[key] = globalVariables[key]
          }
          // Finally use runbook defaults
          else if (variable.defaultValue) {
            initialVars[key] = String(variable.defaultValue)
          }
        })

        setVariables(initialVars)
      } else {
        showError('Failed to load initialization data')
        console.error('Failed to load initialization data:', result.error)
      }
    } catch (error) {
      showError('Failed to initialize variable input')
      console.error('Failed to initialize variable input:', error)
    }
  }

  // プリセット一覧の再読み込み（保存・削除後に使用）
  const reloadPresets = async () => {
    try {
      const response = await fetch('/api/variables/presets')
      const result = await response.json()
      if (result.success) {
        setPresets(result.data)
      }
    } catch (error) {
      console.error('Failed to reload presets:', error)
    }
  }

  const handlePresetChange = async (presetName: string) => {
    setSelectedPreset(presetName)

    if (presetName) {
      try {
        const response = await fetch('/api/variables/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runbookVariables: runbook.variables,
            presetName,
            overrides: {},
          }),
        })

        const result = await response.json()
        if (result.success) {
          setVariables(result.data.variables)
          if (result.data.executionOptions) {
            setExecutionOptions(result.data.executionOptions)
          }
        }
      } catch (error) {
        console.error('Failed to apply preset:', error)
      }
    } else {
      // Reset to defaults
      initializeData()
      setExecutionOptions({ args: [] })
    }
  }

  const handleVariableChange = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }))
  }

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return

    try {
      // runbookで定義されている変数のみを保存
      const runbookVariableKeys = Object.keys(runbook.variables)
      const variablesToSave: Record<string, string> = {}

      runbookVariableKeys.forEach((key) => {
        if (variables[key] !== undefined) {
          variablesToSave[key] = variables[key]
        }
      })

      const response = await fetch('/api/variables/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPresetName,
          variables: variablesToSave,
          executionOptions,
          description: `Preset for ${runbook.name}`,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setNewPresetName('')
        setShowSavePreset(false)
        reloadPresets() // Reload presets
        showSuccess(`Preset '${newPresetName}' saved successfully`)
      } else {
        showError(`Failed to save preset: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to save preset:', error)
      showError('Failed to save preset')
    }
  }

  const handleSubmit = () => {
    // runbookで定義されている変数のみを送信
    const runbookVariableKeys = Object.keys(runbook.variables)
    const variablesToSubmit: Record<string, string> = {}

    runbookVariableKeys.forEach((key) => {
      if (variables[key] !== undefined) {
        variablesToSubmit[key] = variables[key]
      }
    })

    onSubmit(variablesToSubmit, executionOptions)
  }

  const isValidForm = () => {
    return Object.entries(runbook.variables).every(([key, variable]) => {
      if (variable.required) {
        return variables[key] && variables[key].trim() !== ''
      }
      return true
    })
  }

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">Configure Variables</h3>
          <button
            type="button"
            onClick={onCancel}
            class="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div class="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
          <h4 class="text-white font-medium mb-2">📋 {runbook.name}</h4>
          {runbook.description && (
            <p class="text-slate-400 text-sm">{runbook.description}</p>
          )}
        </div>

        {/* Preset Selection */}
        <div class="mb-6">
          <label
            for="variable-preset"
            class="block text-sm font-medium text-white mb-2"
          >
            🎯 Variable Preset
          </label>
          <select
            id="variable-preset"
            value={selectedPreset}
            onChange={(e) =>
              handlePresetChange((e.target as HTMLSelectElement)?.value || '')
            }
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 outline-none"
          >
            <option value="">No preset (use defaults)</option>
            {presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name} {preset.description && `- ${preset.description}`}
              </option>
            ))}
          </select>
        </div>

        {/* Variable Inputs */}
        <div class="space-y-4 mb-6">
          {(() => {
            // 環境変数とrunbook変数を分離
            const envVarEntries: Array<[string, RunbookVariable]> = []
            const runbookVarEntries: Array<[string, RunbookVariable]> = []

            Object.entries(runbook.variables).forEach(([key, variable]) => {
              if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
                envVarEntries.push([key, variable])
              } else {
                runbookVarEntries.push([key, variable])
              }
            })

            return (
              <>
                {/* Environment Variables */}
                {envVarEntries.length > 0 && (
                  <>
                    <h4 class="text-white font-medium flex items-center space-x-2">
                      <span>🔐 Environment Variables</span>
                      <span class="text-xs text-slate-500">
                        ({envVarEntries.length})
                      </span>
                    </h4>
                    {envVarEntries.map(([key, variable]) => {
                      const globalValue = globalVariables[key]
                      const envValue = environmentVariables[key]
                      const hasGlobalDefault = globalValue !== undefined
                      const hasEnvDefault = envValue !== undefined

                      return (
                        <div key={key} class="space-y-2">
                          <label
                            for={`variable-${key}`}
                            class="block text-sm text-slate-300"
                          >
                            {variable.name || key}
                            {variable.required && (
                              <span class="text-red-400 ml-1">*</span>
                            )}
                            {hasEnvDefault && (
                              <span class="text-green-400 ml-2 text-xs">
                                🌍 From Environment
                              </span>
                            )}
                            {!hasEnvDefault && hasGlobalDefault && (
                              <span class="text-blue-400 ml-2 text-xs">
                                Global: {globalValue}
                              </span>
                            )}
                            {variable.type === 'file' && (
                              <span class="text-purple-400 ml-2 text-xs">
                                📁 File Required
                              </span>
                            )}
                            {variable.type === 'json' && (
                              <span class="text-orange-400 ml-2 text-xs">
                                📋 JSON Required
                              </span>
                            )}
                          </label>

                          {variable.type === 'file' ||
                          variable.type === 'json' ? (
                            <FileUpload
                              value={variables[key] || ''}
                              onChange={(value) =>
                                handleVariableChange(key, value)
                              }
                              placeholder={
                                variable.filePath
                                  ? `File path in runbook: ${variable.filePath}`
                                  : undefined
                              }
                              defaultFilePath={
                                variable.filePath ||
                                (typeof variable.defaultValue === 'string'
                                  ? variable.defaultValue
                                  : undefined)
                              }
                              accept={
                                variable.type === 'json'
                                  ? '.json'
                                  : '.txt,.sql,.json,.yaml,.yml,.md,.js,.ts,.py,.sh,.xml,.csv'
                              }
                            />
                          ) : (
                            <input
                              id={`variable-${key}`}
                              type={
                                variable.type === 'number'
                                  ? 'number'
                                  : hasEnvDefault && envValue === '••••••••'
                                    ? 'password'
                                    : 'text'
                              }
                              placeholder={
                                variable.defaultValue?.toString() ||
                                `Enter ${key}...`
                              }
                              value={variables[key] || ''}
                              onInput={(e) =>
                                handleVariableChange(
                                  key,
                                  (e.target as HTMLInputElement)?.value || '',
                                )
                              }
                              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                            />
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Runbook Variables */}
                {runbookVarEntries.length > 0 && (
                  <>
                    <h4 class="text-white font-medium flex items-center space-x-2 mt-6">
                      <span>📝 Runbook Variables (vars)</span>
                      <span class="text-xs text-slate-500">
                        ({runbookVarEntries.length})
                      </span>
                    </h4>
                    {runbookVarEntries.map(([key, variable]) => {
                      const globalValue = globalVariables[key]
                      const envValue = environmentVariables[key]
                      const hasGlobalDefault = globalValue !== undefined
                      const hasEnvDefault = envValue !== undefined

                      return (
                        <div key={key} class="space-y-2">
                          <label
                            for={`variable-${key}`}
                            class="block text-sm text-slate-300"
                          >
                            {variable.name || key}
                            {variable.required && (
                              <span class="text-red-400 ml-1">*</span>
                            )}
                            {hasEnvDefault && (
                              <span class="text-green-400 ml-2 text-xs">
                                🌍 From Environment
                              </span>
                            )}
                            {!hasEnvDefault && hasGlobalDefault && (
                              <span class="text-blue-400 ml-2 text-xs">
                                Global: {globalValue}
                              </span>
                            )}
                            {variable.type === 'file' && (
                              <span class="text-purple-400 ml-2 text-xs">
                                📁 File Required
                              </span>
                            )}
                            {variable.type === 'json' && (
                              <span class="text-orange-400 ml-2 text-xs">
                                📋 JSON Required
                              </span>
                            )}
                          </label>

                          {variable.type === 'file' ||
                          variable.type === 'json' ? (
                            <FileUpload
                              value={variables[key] || ''}
                              onChange={(value) =>
                                handleVariableChange(key, value)
                              }
                              placeholder={
                                variable.filePath
                                  ? `File path in runbook: ${variable.filePath}`
                                  : undefined
                              }
                              defaultFilePath={
                                variable.filePath ||
                                (typeof variable.defaultValue === 'string'
                                  ? variable.defaultValue
                                  : undefined)
                              }
                              accept={
                                variable.type === 'json'
                                  ? '.json'
                                  : '.txt,.sql,.json,.yaml,.yml,.md,.js,.ts,.py,.sh,.xml,.csv'
                              }
                            />
                          ) : (
                            <input
                              id={`variable-${key}`}
                              type={
                                variable.type === 'number'
                                  ? 'number'
                                  : hasEnvDefault && envValue === '••••••••'
                                    ? 'password'
                                    : 'text'
                              }
                              placeholder={
                                variable.defaultValue?.toString() ||
                                `Enter ${key}...`
                              }
                              value={variables[key] || ''}
                              onInput={(e) =>
                                handleVariableChange(
                                  key,
                                  (e.target as HTMLInputElement)?.value || '',
                                )
                              }
                              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                            />
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )
          })()}
        </div>

        {/* Execution Options */}
        <div class="mb-6">
          <h4 class="text-white font-medium mb-3">⚙️ Execution Options</h4>
          <div>
            <label
              for="exec-options"
              class="block text-sm font-medium text-slate-300 mb-2"
            >
              Command Line Arguments
            </label>
            <textarea
              id="exec-options"
              placeholder="Enter runn command line arguments (e.g., --debug --verbose --concurrent on)"
              value={executionOptions.args.join(' ')}
              onInput={(e) => {
                const text = (e.target as HTMLTextAreaElement)?.value || ''
                const args = text.trim() ? text.trim().split(/\s+/) : []
                setExecutionOptions({ args })
              }}
              rows={3}
              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none font-mono text-sm"
            />
            <div class="mt-1 text-xs text-slate-400">
              Example: --debug --verbose --concurrent on --format json
            </div>
          </div>
        </div>

        {/* Save as Preset */}
        <div class="mb-6">
          {!showSavePreset ? (
            <button
              type="button"
              onClick={() => setShowSavePreset(true)}
              class="text-sm text-blue-400 hover:text-blue-300"
            >
              💾 Save current values as preset
            </button>
          ) : (
            <div class="flex space-x-2">
              <input
                type="text"
                placeholder="Preset name..."
                value={newPresetName}
                onInput={(e) =>
                  setNewPresetName((e.target as HTMLInputElement)?.value || '')
                }
                class="flex-1 px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                class="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-white"
              >
                Save
              </button>
              <button
                type="button"
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

        {/* Action Buttons */}
        <div class="flex space-x-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValidForm()}
            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-white font-medium"
          >
            ▶️ Execute Runbook
          </button>
          <button
            type="button"
            onClick={onCancel}
            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-slate-300"
          >
            Cancel
          </button>
        </div>

        {/* Validation Status */}
        {!isValidForm() && (
          <div class="mt-3 p-2 bg-red-900/20 border border-red-500/50 rounded text-red-300 text-sm">
            ⚠️ Please fill in all required variables
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  )
}
