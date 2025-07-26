import { useEffect, useState } from 'hono/jsx'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // モーダル表示時にスクロールを無効化
  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter') {
        onConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onConfirm, onCancel])

  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: '⚠️',
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          iconColor: 'text-red-400',
        }
      case 'warning':
        return {
          icon: '⚠️',
          confirmButton:
            'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          iconColor: 'text-yellow-400',
        }
      case 'info':
        return {
          icon: 'ℹ️',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          iconColor: 'text-blue-400',
        }
      default:
        return {
          icon: '❓',
          confirmButton: 'bg-slate-600 hover:bg-slate-700 focus:ring-slate-500',
          iconColor: 'text-slate-400',
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div class="flex items-center p-6 border-b border-slate-700">
          <div class={`text-2xl mr-3 ${styles.iconColor}`}>{styles.icon}</div>
          <h3 class="text-lg font-semibold text-white">{title}</h3>
        </div>

        {/* Content */}
        <div class="p-6">
          <p class="text-slate-300 mb-6">{message}</p>

          {/* Actions */}
          <div class="flex space-x-3 justify-end">
            <button
              onClick={onCancel}
              class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded text-slate-300 transition-colors focus:ring-2 focus:ring-slate-500 focus:outline-none"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              class={`px-4 py-2 rounded text-white font-medium transition-colors focus:ring-2 focus:outline-none ${styles.confirmButton}`}
            >
              {confirmText}
            </button>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div class="px-6 pb-4 text-xs text-slate-500">
          Press <kbd class="px-1 bg-slate-700 rounded">ESC</kbd> to cancel,{' '}
          <kbd class="px-1 bg-slate-700 rounded">Enter</kbd> to confirm
        </div>
      </div>
    </div>
  )
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<
    Omit<ConfirmDialogProps, 'isOpen' | 'onConfirm' | 'onCancel'>
  >({
    title: '',
    message: '',
  })
  const [resolvePromise, setResolvePromise] = useState<
    ((value: boolean) => void) | null
  >(null)

  const showConfirm = (
    title: string,
    message: string,
    options?: {
      confirmText?: string
      cancelText?: string
      variant?: 'danger' | 'warning' | 'info'
    },
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        title,
        message,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        variant: options?.variant,
      })
      setResolvePromise(() => resolve)
      setIsOpen(true)
    })
  }

  const handleConfirm = () => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(true)
      setResolvePromise(null)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(false)
      setResolvePromise(null)
    }
  }

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={isOpen}
      {...config}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return {
    showConfirm,
    ConfirmDialogComponent,
  }
}
