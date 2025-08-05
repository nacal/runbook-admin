import type { Highlighter } from 'shiki'

// グローバルなShikiインスタンス
let shikiInstance: Highlighter | null = null
let initPromise: Promise<Highlighter> | null = null

/**
 * Shikiハイライターを初期化
 * アプリ起動時に一度だけ呼び出す
 */
export async function initializeShiki(): Promise<Highlighter> {
  // 既に初期化済みの場合
  if (shikiInstance) {
    return shikiInstance
  }

  // 初期化中の場合は既存のPromiseを返す
  if (initPromise) {
    return initPromise
  }

  // 新規初期化
  initPromise = import('shiki').then(async ({ createHighlighter }) => {
    try {
      shikiInstance = await createHighlighter({
        themes: ['github-dark'],
        langs: [
          'yaml',
          'json',
          'sql',
          'python',
          'typescript',
          'javascript',
          'bash',
          'markdown',
        ],
      })
      return shikiInstance
    } catch (err) {
      console.error('[Shiki] Failed to initialize highlighter:', err)
      throw err
    }
  })

  return initPromise
}

/**
 * 初期化済みのShikiインスタンスを同期的に取得
 * 初期化されていない場合はnullを返す
 */
export function getShikiInstance(): Highlighter | null {
  return shikiInstance
}

/**
 * HTMLエスケープユーティリティ
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
