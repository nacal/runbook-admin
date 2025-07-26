import { useEffect, useState } from 'hono/jsx'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

interface ToastProps {
  messages: ToastMessage[]
  onRemove: (id: string) => void
}

export function Toast({ messages, onRemove }: ToastProps) {
  return (
    <div class="fixed top-4 right-4 z-50 space-y-2">
      {messages.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage
  onRemove: (id: string) => void
}) {
  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-800 border-green-600 text-green-200'
      case 'error':
        return 'bg-red-800 border-red-600 text-red-200'
      case 'info':
        return 'bg-blue-800 border-blue-600 text-blue-200'
      default:
        return 'bg-slate-800 border-slate-600 text-slate-200'
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'info':
        return 'ℹ️'
      default:
        return '📢'
    }
  }

  return (
    <div
      class={`${getToastStyles()} border rounded-lg p-4 shadow-lg max-w-sm w-full transform transition-all duration-300 ease-in-out`}
    >
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-2">
          <span class="text-lg">{getIcon()}</span>
          <p class="text-sm font-medium flex-1">{toast.message}</p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          class="text-current opacity-70 hover:opacity-100 ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (
    message: string,
    type: ToastMessage['type'] = 'info',
    duration?: number,
  ) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: ToastMessage = { id, type, message, duration }

    setToasts((prev) => [...prev, toast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const showSuccess = (message: string, duration?: number) =>
    showToast(message, 'success', duration)
  const showError = (message: string, duration?: number) =>
    showToast(message, 'error', duration)
  const showInfo = (message: string, duration?: number) =>
    showToast(message, 'info', duration)

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    removeToast,
  }
}
