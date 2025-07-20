import { readdir, readFile, stat } from 'fs/promises'
import { join, basename, relative } from 'path'
import type { Runbook } from './types'

export class FileScanner {
  private rootPath: string
  private patterns = [
    /\.runbook\.ya?ml$/,
    /\/runbooks\/.*\.ya?ml$/,
    /\/tests\/.*\.ya?ml$/,
    /\.runn\.ya?ml$/
  ]
  
  private ignore = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage'
  ]

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath
  }

  async scanRunbooks(): Promise<Runbook[]> {
    try {
      const files = await this.findFiles(this.rootPath)
      const runbooks = await Promise.allSettled(
        files.map(filePath => this.parseRunbook(filePath))
      )

      return runbooks
        .filter((result): result is PromiseFulfilledResult<Runbook> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)
    } catch (error) {
      console.error('Error scanning runbooks:', error)
      return []
    }
  }

  private async findFiles(dir: string, files: string[] = []): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        if (!this.ignore.includes(entry.name)) {
          await this.findFiles(fullPath, files)
        }
      } else if (entry.isFile()) {
        if (this.patterns.some(pattern => pattern.test(fullPath))) {
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
      const yaml = load(content) as any
      
      const runbook: Runbook = {
        id: this.generateId(filePath),
        path: relative(this.rootPath, filePath),
        name: basename(filePath, '.yml').replace(/\.(runbook|runn)$/, ''),
        description: yaml.desc || yaml.description,
        steps: this.countSteps(yaml),
        lastModified: stats.mtime,
        variables: this.extractVariables(yaml),
        labels: yaml.labels || []
      }

      return runbook
    } catch (error) {
      throw new Error(`Failed to parse runbook ${filePath}: ${error}`)
    }
  }

  private generateId(filePath: string): string {
    return Buffer.from(filePath).toString('base64').slice(0, 8)
  }

  private countSteps(yaml: any): number {
    if (!yaml.steps) return 0
    return Array.isArray(yaml.steps) ? yaml.steps.length : 0
  }

  private extractVariables(yaml: any): Record<string, any> {
    const variables: Record<string, any> = {}
    
    if (yaml.vars) {
      Object.entries(yaml.vars).forEach(([key, value]) => {
        variables[key] = {
          name: key,
          defaultValue: value,
          type: this.inferType(value),
          required: false
        }
      })
    }

    const content = JSON.stringify(yaml)
    const envVarPattern = /\$\{([A-Z_][A-Z0-9_]*)\}/g
    let match
    while ((match = envVarPattern.exec(content)) !== null) {
      const varName = match[1]
      if (!variables[varName]) {
        variables[varName] = {
          name: varName,
          type: 'env',
          required: true
        }
      }
    }

    return variables
  }

  private inferType(value: any): 'string' | 'number' | 'boolean' | 'env' {
    if (typeof value === 'string' && value.startsWith('${')) {
      return 'env'
    }
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    return 'string'
  }
}