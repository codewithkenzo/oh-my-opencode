import type { WorkspaceContext, ScannedFile } from "./workspace-types"

export function formatWorkspaceContext(context: WorkspaceContext): string {
  if (context.files.length === 0) {
    return ""
  }

  const sections: string[] = []

  const byCategory = groupByCategory(context.files)

  for (const [category, files] of Object.entries(byCategory)) {
    const section = formatCategory(category, files, context.contents)
    if (section) {
      sections.push(section)
    }
  }

  if (sections.length === 0) {
    return ""
  }

  return `\n## Workspace Resources\n${sections.join("\n")}`
}

function groupByCategory(files: ScannedFile[]): Record<string, ScannedFile[]> {
  const groups: Record<string, ScannedFile[]> = {}

  for (const file of files) {
    if (!groups[file.category]) {
      groups[file.category] = []
    }
    groups[file.category].push(file)
  }

  return groups
}

function formatCategory(
  category: string,
  files: ScannedFile[],
  contents: Map<string, string>
): string {
  const readFiles = files.filter(f => f.action === 'read')
  const listFiles = files.filter(f => f.action === 'list')

  const parts: string[] = []

  const categoryTitle = capitalizeFirst(category)

  if (readFiles.length > 0) {
    const readContent = readFiles
      .filter(f => contents.has(f.path))
      .map(f => formatFileContent(f.path, contents.get(f.path)!))
      .join("\n")

    if (readContent) {
      parts.push(`### ${categoryTitle}\n${readContent}`)
    }
  }

  if (listFiles.length > 0) {
    const header = readFiles.length > 0
      ? `### ${categoryTitle} (available)`
      : `### ${categoryTitle}`

    const fileList = listFiles
      .map(f => `- ${f.path} (${formatSize(f.size)})`)
      .join("\n")

    parts.push(`${header}\n${fileList}`)
  }

  return parts.join("\n\n")
}

function formatFileContent(path: string, content: string): string {
  const ext = path.split('.').pop() || ''
  const lang = getLanguageHint(ext)

  return `<file path="${path}"${lang ? ` lang="${lang}"` : ''}>
${content.trim()}
</file>`
}

function getLanguageHint(ext: string): string {
  const langMap: Record<string, string> = {
    'md': 'markdown',
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'py': 'python',
    'sh': 'bash',
    'css': 'css',
    'html': 'html'
  }
  return langMap[ext] || ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
