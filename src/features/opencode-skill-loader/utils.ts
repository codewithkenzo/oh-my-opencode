import { promises as fs } from "fs"
import { join } from "path"
import { parseFrontmatter } from "../../shared/frontmatter"

export async function collectMdFilesRecursive(
  dir: string,
  currentDepth: number,
  maxDepth: number = 3,
  basePath: string = ''
): Promise<{ path: string; content: string }[]> {
  if (currentDepth > maxDepth) return []

  const results: { path: string; content: string }[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isSymbolicLink()) continue

    const entryPath = join(dir, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      const subdirFiles = await collectMdFilesRecursive(
        entryPath,
        currentDepth + 1,
        maxDepth,
        relativePath
      )
      results.push(...subdirFiles)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (currentDepth > 0) {
        const content = await fs.readFile(entryPath, 'utf-8')
        const { body } = parseFrontmatter(content)
        results.push({ path: relativePath, content: body.trim() })
      }
    }
  }

  return results.sort((a, b) => a.path.localeCompare(b.path))
}
