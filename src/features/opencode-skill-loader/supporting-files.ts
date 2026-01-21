import { promises as fs } from "fs"
import { join, extname } from "path"

export interface SupportingFile {
  relativePath: string   // "scripts/setup.sh"
  absolutePath: string   // Full path
  sizeBytes: number      // File size
  extension: string      // ".sh", ".json", etc.
}

const DISCOVERY_LIMITS = {
  MAX_FILES: 20,
  MAX_FILE_SIZE: 1024 * 1024,        // 1MB per file
  MAX_TOTAL_SIZE: 10 * 1024 * 1024,  // 10MB total
} as const

const EXCLUDED_DIRS = new Set(['node_modules', '__pycache__', 'dist', 'build', '.git'])

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

async function collectNonMdFilesRecursive(
  dir: string,
  basePath: string,
  results: SupportingFile[]
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue
    if (entry.isSymbolicLink()) continue
    
    const entryPath = join(dir, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name
    
    if (entry.isDirectory()) {
      await collectNonMdFilesRecursive(entryPath, relativePath, results)
    } else if (entry.isFile() && !entry.name.endsWith('.md')) {
      const stats = await fs.stat(entryPath).catch(() => null)
      if (stats) {
        results.push({
          relativePath,
          absolutePath: entryPath,
          sizeBytes: stats.size,
          extension: extname(entry.name),
        })
      }
    }
  }
}

/**
 * Discover supporting (non-.md) files in a skill directory.
 * 
 * Algorithm (DETERMINISTIC):
 * 1. Recursively collect all non-.md, non-hidden files
 * 2. Sort alphabetically by relativePath
 * 3. Apply limits: max 20 files, skip >1MB files, stop at 10MB total
 * 
 * @param skillDir The skill's resolved directory path
 * @returns Array of SupportingFile metadata (no file contents)
 */
export async function discoverSupportingFiles(skillDir: string): Promise<SupportingFile[]> {
  const allFiles: SupportingFile[] = []
  
  await collectNonMdFilesRecursive(skillDir, '', allFiles)
  
  // Sort alphabetically by relativePath (DETERMINISTIC)
  allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  
  // Apply limits
  const result: SupportingFile[] = []
  let totalSize = 0
  let skippedLargeFiles = 0
  
  for (const file of allFiles) {
    if (result.length >= DISCOVERY_LIMITS.MAX_FILES) {
      console.warn(`[skill-loader] Supporting files limit reached (${DISCOVERY_LIMITS.MAX_FILES}), skipping remaining ${allFiles.length - result.length} files`)
      break
    }
    
    if (file.sizeBytes > DISCOVERY_LIMITS.MAX_FILE_SIZE) {
      console.warn(`[skill-loader] Skipping large file: ${file.relativePath} (${formatSize(file.sizeBytes)} > 1MB)`)
      skippedLargeFiles++
      continue
    }
    
    if (totalSize + file.sizeBytes > DISCOVERY_LIMITS.MAX_TOTAL_SIZE) {
      console.warn(`[skill-loader] Total size limit reached (10MB), stopping discovery`)
      break
    }
    
    result.push(file)
    totalSize += file.sizeBytes
  }
  
  if (skippedLargeFiles > 0) {
    console.warn(`[skill-loader] Skipped ${skippedLargeFiles} files exceeding 1MB size limit`)
  }
  
  return result
}

// Export for testing
export { DISCOVERY_LIMITS }
