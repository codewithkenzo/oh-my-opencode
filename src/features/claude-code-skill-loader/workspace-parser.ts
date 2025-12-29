import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { parse as parseYaml } from "yaml"
import type { SkillWorkspaceManifest, CategoryConfig } from "./workspace-types"

const RESERVED_KEYS = ['defaults', 'ignore'] as const

export function parseWorkspaceManifest(skillDir: string): SkillWorkspaceManifest | null {
  const manifestPath = join(skillDir, "manifest.yaml")

  if (!existsSync(manifestPath)) {
    return null
  }

  try {
    const content = readFileSync(manifestPath, "utf-8")
    const parsed = parseYaml(content) as Record<string, unknown>
    return validateManifest(parsed)
  } catch {
    return null
  }
}

function validateManifest(parsed: Record<string, unknown>): SkillWorkspaceManifest {
  const manifest: SkillWorkspaceManifest = {}

  if (parsed.defaults && typeof parsed.defaults === 'object') {
    const defaults = parsed.defaults as Record<string, unknown>
    manifest.defaults = {
      max_size: typeof defaults.max_size === 'number' ? defaults.max_size : undefined
    }
  }

  if (Array.isArray(parsed.ignore)) {
    manifest.ignore = parsed.ignore.filter((i): i is string => typeof i === 'string')
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (RESERVED_KEYS.includes(key as typeof RESERVED_KEYS[number])) continue
    if (!value || typeof value !== 'object') continue

    const cat = value as Record<string, unknown>
    const config: CategoryConfig = {}

    if (Array.isArray(cat.read)) {
      config.read = cat.read.filter((r): r is string => typeof r === 'string')
    }
    if (Array.isArray(cat.list)) {
      config.list = cat.list.filter((l): l is string => typeof l === 'string')
    }
    if (typeof cat.max_size === 'number') {
      config.max_size = cat.max_size
    }

    if (config.read || config.list) {
      manifest[key] = config
    }
  }

  return manifest
}

export function getDefaultManifest(): SkillWorkspaceManifest {
  return {
    defaults: { max_size: 2048 },
    ignore: [],
    knowledge: { read: ['*.md'], max_size: 2048 },
    config: { read: ['*.json', '*.yaml', '*.yml'], max_size: 1024 },
    scripts: { list: ['**/*.ts', '**/*.js'] },
    examples: { list: ['**/*'] }
  }
}
