import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import type { Runbook, RunbookVariable } from '../types/types'
import { getProjectPath } from '../utils/project-context'

export class FileScanner {
  private rootPath: string

  private ignore = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.pnpm',
    'vendor',
  ]

  constructor(rootPath?: string) {
    this.rootPath = rootPath || getProjectPath()
  }

  async scanRunbooks(): Promise<Runbook[]> {
    try {
      const files = await this.findFiles(this.rootPath)
      const runbooks = await Promise.allSettled(
        files.map((filePath) => this.parseRunbook(filePath)),
      )

      return runbooks
        .filter(
          (result): result is PromiseFulfilledResult<Runbook> =>
            result.status === 'fulfilled',
        )
        .map((result) => result.value)
    } catch (error) {
      console.error('Error scanning runbooks:', error)
      return []
    }
  }

  private async findFiles(
    dir: string,
    files: string[] = [],
  ): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        if (!this.ignore.includes(entry.name)) {
          await this.findFiles(fullPath, files)
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
          files.push(fullPath)
        }
      }
    }

    return files
  }

  private async parseRunbook(filePath: string): Promise<Runbook> {
    const content = await readFile(filePath, 'utf-8')
    const stats = await stat(filePath)

    try {
      const { load } = await import('js-yaml')
      const yaml = load(content) as Record<
        string,
        string | number | boolean | object | null
      >

      // Check if this is a valid runbook (has steps or is empty)
      if (
        yaml &&
        typeof yaml === 'object' &&
        ('steps' in yaml || 'desc' in yaml || 'description' in yaml)
      ) {
        const name = basename(filePath)
          .replace(/\.ya?ml$/, '')
          .replace(/\.(runbook|runn)$/, '')

        const relativePath = relative(this.rootPath, filePath)

        const runbook: Runbook = {
          id: this.generateId(relativePath),
          path: relativePath,
          name,
          description:
            (yaml.desc as string) || (yaml.description as string) || '',
          steps: this.countSteps(yaml),
          lastModified: stats.mtime,
          variables: this.extractVariables(yaml),
          labels: (yaml.labels as string[]) || [],
        }

        return runbook
      } else {
        throw new Error('Not a valid runbook format')
      }
    } catch (error) {
      // Log the error for debugging but don't stop the scan
      console.debug(`Skipping ${relative(this.rootPath, filePath)}: ${error}`)
      throw error
    }
  }

  private generateId(relativePath: string): string {
    // Use SHA-1 like runn does for compatibility
    // This allows using the same ID format as runn list command
    return createHash('sha1').update(relativePath).digest('hex')
  }

  private countSteps(
    yaml: Record<string, string | number | boolean | object | null>,
  ): number {
    const steps = yaml.steps
    if (!steps) return 0
    return Array.isArray(steps) ? steps.length : 0
  }

  private extractVariables(
    yaml: Record<string, string | number | boolean | object | null>,
  ): Record<string, RunbookVariable> {
    const variables: Record<string, RunbookVariable> = {}

    const vars = yaml.vars as
      | Record<string, string | number | boolean>
      | undefined
    if (vars) {
      Object.entries(vars).forEach(([key, value]) => {
        const type = this.inferType(value)
        let filePath: string | undefined

        if (typeof value === 'string') {
          if (value.startsWith('file://')) {
            filePath = value.substring(7)
          } else if (value.startsWith('json://')) {
            filePath = value.substring(7)
          }
        }

        variables[key] = {
          name: key,
          defaultValue: value,
          type: type,
          required: false,
          filePath: filePath,
        }
      })
    }

    const content = JSON.stringify(yaml)
    const envVarPattern = /\$\{([A-Z_][A-Z0-9_]*)\}/g
    const matches = content.matchAll(envVarPattern)
    for (const match of matches) {
      const varName = match[1]
      if (!variables[varName]) {
        variables[varName] = {
          name: varName,
          type: 'env',
          required: true,
        }
      }
    }

    return variables
  }

  private inferType(
    value: string | number | boolean,
  ): 'string' | 'number' | 'boolean' | 'env' | 'file' | 'json' {
    if (typeof value === 'string') {
      if (value.startsWith('${')) {
        return 'env'
      }
      if (value.startsWith('file://')) {
        return 'file'
      }
      if (value.startsWith('json://')) {
        return 'json'
      }
    }
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    return 'string'
  }
}
