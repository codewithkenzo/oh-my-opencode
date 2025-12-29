import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { join, relative } from "path"
import picomatch from "picomatch"
import type { SkillWorkspaceManifest, ScannedFile, WorkspaceContext, CategoryConfig } from "./workspace-types"

const DEFAULT_IGNORE = ['node_modules', '.git', '.*', '*.log', 'SKILL.md', 'manifest.yaml']
const MAX_TOTAL_SIZE = 32768

export function scanWorkspace(
  skillDir: string,
  manifest: SkillWorkspaceManifest | null
): WorkspaceContext {
  const effectiveManifest = manifest ?? getDefaultManifest()
  const ignorePatterns = [...DEFAULT_IGNORE, ...(effectiveManifest.ignore ?? [])]
  const ignoreMatcher = picomatch(ignorePatterns)

  const allFiles = scanDirectoryRecursive(skillDir, skillDir, ignoreMatcher)
  const categorizedFiles = categorizeFiles(allFiles, effectiveManifest, skillDir)
  const contents = readFileContents(categorizedFiles, effectiveManifest)

  return {
    files: categorizedFiles,
    contents,
    manifest: effectiveManifest
  }
}

function scanDirectoryRecursive(
  baseDir: string,
  currentDir: string,
  ignoreMatcher: (path: string) => boolean
): string[] {
  const files: string[] = []

  if (!existsSync(currentDir)) return files

  try {
    const entries = readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const relativePath = relative(baseDir, join(currentDir, entry.name))

      if (ignoreMatcher(relativePath) || ignoreMatcher(entry.name)) {
        continue
      }

      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        files.push(...scanDirectoryRecursive(baseDir, fullPath, ignoreMatcher))
      } else if (entry.isFile()) {
        files.push(relativePath)
      }
    }
  } catch {
  }

  return files
}

function categorizeFiles(
  files: string[],
  manifest: SkillWorkspaceManifest,
  skillDir: string
): ScannedFile[] {
  const result: ScannedFile[] = []
  const categorized = new Set<string>()

  const categories = Object.entries(manifest).filter(
    ([key]) => !['defaults', 'ignore'].includes(key) && typeof manifest[key] === 'object'
  ) as [string, CategoryConfig][]

  for (const [categoryName, config] of categories) {
    if (config.read) {
      const readMatcher = picomatch(config.read)
      for (const file of files) {
        if (categorized.has(file)) continue
        if (readMatcher(file)) {
          const absolutePath = join(skillDir, file)
          const size = getFileSize(absolutePath)
          result.push({
            path: file,
            absolutePath,
            size,
            category: categoryName,
            action: 'read'
          })
          categorized.add(file)
        }
      }
    }

    if (config.list) {
      const listMatcher = picomatch(config.list)
      for (const file of files) {
        if (categorized.has(file)) continue
        if (listMatcher(file)) {
          const absolutePath = join(skillDir, file)
          const size = getFileSize(absolutePath)
          result.push({
            path: file,
            absolutePath,
            size,
            category: categoryName,
            action: 'list'
          })
          categorized.add(file)
        }
      }
    }
  }

  return result
}

function readFileContents(
  files: ScannedFile[],
  manifest: SkillWorkspaceManifest
): Map<string, string> {
  const contents = new Map<string, string>()
  const defaultMaxSize = manifest.defaults?.max_size ?? 2048
  let totalSize = 0

  const readFiles = files.filter(f => f.action === 'read')

  for (const file of readFiles) {
    const categoryConfig = manifest[file.category] as CategoryConfig | undefined
    const maxSize = categoryConfig?.max_size ?? defaultMaxSize

    if (file.size > maxSize) continue

    if (totalSize + file.size > MAX_TOTAL_SIZE) continue

    try {
      const content = readFileSync(file.absolutePath, 'utf-8')
      contents.set(file.path, content)
      totalSize += file.size
    } catch {
    }
  }

  return contents
}

function getFileSize(filePath: string): number {
  try {
    return statSync(filePath).size
  } catch {
    return 0
  }
}

function getDefaultManifest(): SkillWorkspaceManifest {
  return {
    defaults: { max_size: 2048 },
    ignore: [],
    knowledge: { read: ['*.md'], max_size: 2048 },
    config: { read: ['*.json', '*.yaml', '*.yml'], max_size: 1024 },
    scripts: { list: ['**/*.ts', '**/*.js'] },
    examples: { list: ['**/*'] }
  }
}
