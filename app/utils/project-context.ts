/**
 * プロジェクトパスの管理を行うモジュール
 * 環境変数に依存せずにアプリケーション全体でプロジェクトパスを管理する
 */

let projectPath: string | null = null

/**
 * 現在のプロジェクトパスを取得する
 * 環境変数PROJECT_PATHがあればそれを優先、なければprocess.cwd()
 * @returns プロジェクトのルートパス
 */
export function getProjectPath(): string {
  if (projectPath !== null) {
    return projectPath
  }

  // 環境変数からプロジェクトパスを取得（起動時に設定される）
  const envPath = process.env.PROJECT_PATH
  if (envPath) {
    projectPath = envPath
    return envPath
  }

  // フォールバック
  projectPath = process.cwd()
  return projectPath
}
