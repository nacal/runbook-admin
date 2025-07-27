/**
 * プロジェクトパスの管理を行うシングルトンクラス
 * 環境変数に依存せずにアプリケーション全体でプロジェクトパスを管理する
 */
export class ProjectContext {
  private static projectPath: string | null = null

  /**
   * プロジェクトパスを設定する
   * @param path プロジェクトのルートパス
   */
  static setProjectPath(path: string): void {
    ProjectContext.projectPath = path
  }

  /**
   * 現在のプロジェクトパスを取得する
   * 環境変数PROJECT_PATHがあればそれを優先、なければprocess.cwd()
   * @returns プロジェクトのルートパス
   */
  static getProjectPath(): string {
    if (ProjectContext.projectPath !== null) {
      return ProjectContext.projectPath
    }

    // 環境変数からプロジェクトパスを取得（起動時に設定される）
    const envPath = process.env.PROJECT_PATH
    if (envPath) {
      ProjectContext.projectPath = envPath
      return envPath
    }

    // フォールバック
    ProjectContext.projectPath = process.cwd()
    return ProjectContext.projectPath
  }

  /**
   * テスト用: プロジェクトパスをリセットする
   * @internal
   */
  static reset(): void {
    ProjectContext.projectPath = null
  }
}
