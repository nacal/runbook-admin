import { EnvironmentSettings } from '@/islands/EnvironmentSettings'

interface EnvironmentSettingsModalProps {
  backUrl: string
}

export async function EnvironmentSettingsModal({
  backUrl,
}: EnvironmentSettingsModalProps) {
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
            <h2 class="text-xl font-bold text-white">Environment Settings</h2>
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
            <EnvironmentSettings
              onClose={() => {
                window.location.href = backUrl
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
