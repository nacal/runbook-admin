import { useState, useEffect, useRef } from 'hono/jsx'
import Prism from 'prismjs'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-markdown'
import { PrismStyles } from '../components/PrismStyles'

interface FilePreviewModalProps {
  isOpen: boolean
  fileName: string
  content: string
  onClose: () => void
}

function FilePreviewModal({ isOpen, fileName, content, onClose }: FilePreviewModalProps) {
  const preRef = useRef<HTMLPreElement>(null)

  // Detect language from file extension for Prism
  const getLanguageFromFileName = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'sql': return 'sql'
      case 'json': return 'json'
      case 'yaml':
      case 'yml': return 'yaml'
      case 'py': return 'python'
      case 'js': return 'javascript'
      case 'ts': return 'typescript'
      case 'sh': return 'bash'
      case 'md': return 'markdown'
      default: return 'plaintext'
    }
  }

  useEffect(() => {
    if (isOpen && preRef.current) {
      const language = getLanguageFromFileName(fileName)
      
      try {
        const highlighted = Prism.highlight(content, Prism.languages[language] || Prism.languages.plaintext, language)
        preRef.current.innerHTML = highlighted
        preRef.current.className = `language-${language}`
      } catch (error) {
        // Fallback to plain text if highlighting fails
        console.warn('Prism highlighting failed:', error)
        preRef.current.textContent = content
        preRef.current.className = 'language-plaintext'
      }
    }
  }, [isOpen, content, fileName])

  if (!isOpen) return null

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 class="text-lg font-semibold text-white flex items-center">
            📄 {fileName}
          </h3>
          <button
            onClick={onClose}
            class="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div class="flex-1 overflow-auto p-4">
          <div class="bg-slate-900 border border-slate-600 rounded p-4 overflow-auto">
            <pre 
              ref={preRef}
              class="text-sm whitespace-pre-wrap font-mono overflow-x-auto"
              style="word-break: break-all; white-space: pre-wrap;"
            >
              {content}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div class="p-4 border-t border-slate-700 text-center">
          <div class="text-xs text-slate-500">
            {content.length.toLocaleString()} characters
          </div>
        </div>
      </div>
    </div>
  )
}

export interface FileUploadProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  accept?: string
  defaultFilePath?: string
}

export function FileUpload({ 
  value, 
  onChange, 
  placeholder, 
  className = '',
  accept = '.txt,.sql,.json,.yaml,.yml,.md,.js,.ts,.py,.sh,.xml,.csv',
  defaultFilePath
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Check if value is the default file:// or json:// scheme value
  const isDefaultValue = value && defaultFilePath && (
    (value.startsWith('file://') && value === `file://${defaultFilePath}`) ||
    (value.startsWith('json://') && value === `json://${defaultFilePath}`)
  )
  
  const [showUpload, setShowUpload] = useState(!defaultFilePath || (!!value && !isDefaultValue))
  const inputId = `file-upload-${Math.random().toString(36).substring(2, 9)}`
  

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (file) {
      setIsLoading(true)
      setFileName(file.name)
      
      try {
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result as string
          onChange(content)
          setIsLoading(false)
        }
        reader.onerror = () => {
          setIsLoading(false)
          setFileName('')
        }
        reader.readAsText(file)
      } catch (error) {
        setIsLoading(false)
        setFileName('')
      }
    }
  }

  return (
    <div class={`space-y-3 ${className}`}>
      
      {/* Default file path display */}
      {defaultFilePath && !showUpload && (isDefaultValue || !value) && (
        <div class="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="text-sm text-slate-400 mb-1">Default file:</div>
              <div class="text-white font-mono text-sm">{defaultFilePath}</div>
            </div>
            <label
              for={inputId}
              class="ml-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors cursor-pointer"
            >
              📁 Change
            </label>
            <input
              type="file"
              onChange={handleFileUpload}
              class="hidden"
              id={inputId}
              accept={accept}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* File upload area */}
      {(showUpload || !defaultFilePath) && (
        <div class="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center hover:border-slate-500 transition-colors">
          <input
            type="file"
            onChange={handleFileUpload}
            class="hidden"
            id={inputId}
            accept={accept}
            disabled={isLoading}
          />
          <label
            for={inputId}
            class={`cursor-pointer inline-flex flex-col items-center space-y-2 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200'
            } transition-colors`}
          >
            {isLoading ? (
              <>
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <div class="text-sm">Loading...</div>
              </>
            ) : (
              <>
                <div class="text-2xl">📁</div>
                <div class="text-sm font-medium">
                  Click to select file
                </div>
                <div class="text-xs text-slate-500">
                  {placeholder || 'Choose a text file'}
                </div>
              </>
            )}
          </label>
        </div>
      )}
      
      {value && fileName && (
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-green-400">
              ✅ {fileName}
            </span>
            <span class="text-slate-500">
              {value.length.toLocaleString()} chars
            </span>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                👁️ Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setFileName('')
                  setShowUpload(false)
                }}
                class="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                🗑️ Clear file
              </button>
            </div>
            {defaultFilePath && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setFileName('')
                  setShowUpload(false)
                }}
                class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                ↩️ Use default
              </button>
            )}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={showPreview}
        fileName={fileName || 'File'}
        content={value}
        onClose={() => setShowPreview(false)}
      />
      
      {/* Prism Styles */}
      <PrismStyles />
    </div>
  )
}