import { createRoute } from 'honox/factory'
import { EnvironmentManager } from '../../../services/environment-manager'
import { VariableManager } from '../../../services/variable-manager'

// VariableInputモーダル用の統合初期データAPI
export const GET = createRoute(async (c) => {
  try {
    const runbookId = c.req.query('runbookId')

    if (!runbookId) {
      return c.json(
        {
          success: false,
          error: 'runbookId parameter is required',
        },
        400,
      )
    }

    console.log(
      `📄 Loading variable initialization data for runbook: ${runbookId}`,
    )

    // 並列で全データを取得
    const [presets, globalVariables, environmentVariables] = await Promise.all([
      VariableManager.getInstance().getAllPresets(),
      VariableManager.getInstance().getGlobalVariables(),
      getEnvironmentVariables(),
    ])

    console.log(`✅ Variable initialization data loaded`, {
      presetsCount: presets.length,
      globalVarsCount: Object.keys(globalVariables).length,
      envVarsCount: Object.keys(environmentVariables).length,
      runbookId,
      timestamp: new Date().toISOString(),
    })

    return c.json({
      success: true,
      data: {
        presets,
        globalVariables,
        environmentVariables,
        runbookId,
      },
    })
  } catch (error) {
    console.error('❌ Error loading variable initialization data:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load initialization data',
        data: {
          presets: [],
          globalVariables: {},
          environmentVariables: {},
        },
      },
      500,
    )
  }
})

// 環境変数取得のヘルパー関数
async function getEnvironmentVariables(): Promise<Record<string, string>> {
  try {
    const manager = EnvironmentManager.getInstance()
    const variables = await manager.getMaskedVariables()

    // 配列形式から辞書形式に変換
    const envVars: Record<string, string> = {}
    variables.forEach((variable: any) => {
      envVars[variable.key] = variable.value
    })

    return envVars
  } catch (error) {
    console.warn('Failed to load environment variables:', error)
    return {}
  }
}
