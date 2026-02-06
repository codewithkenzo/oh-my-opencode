import * as fs from "fs"
import { log } from "./logger"

// Migration map: old keys → new keys (for backward compatibility)
export const AGENT_NAME_MAP: Record<string, string> = {
  // Sisyphus variants → "Musashi"
  omo: "Musashi",
  OmO: "Musashi",
  Sisyphus: "Musashi",
  sisyphus: "Musashi",
  "Senshi - distributor": "Musashi",
  "Seichou - growth": "Musashi",
  "Tsunagi - networker": "Musashi",

  // Prometheus/Planner variants → "Musashi - plan"
  "OmO-Plan": "Musashi - plan",
  "omo-plan": "Musashi - plan",
  "Planner-Sisyphus": "Musashi - plan",
  "planner-sisyphus": "Musashi - plan",
  "Prometheus (Planner)": "Musashi - plan",
  prometheus: "Musashi - plan",
  metis: "Musashi - plan",
  momus: "Musashi - plan",
  "M1 - analyst": "Musashi - plan",
  "M2 - reviewer": "Musashi - plan",

  // Atlas/Orchestrator variants → "Musashi - boulder"
  "orchestrator-sisyphus": "Musashi - boulder",
  Atlas: "Musashi - boulder",
  atlas: "Musashi - boulder",

  // Oracle variants → "K9 - advisor"
  oracle: "K9 - advisor",
  Oracle: "K9 - advisor",
  "G5 - debugger": "K9 - advisor",
  "B3 - security": "K9 - advisor",
  "O9 - specialist": "K9 - advisor",

  // Librarian variants → "R2 - researcher"
  librarian: "R2 - researcher",
  Librarian: "R2 - researcher",

  // Explore variants → "X1 - explorer"
  explore: "X1 - explorer",
  Explore: "X1 - explorer",

  // Multimodal-looker/Frontend variants → "T4 - frontend builder"
  "multimodal-looker": "T4 - frontend builder",
  "V1 - viewer": "T4 - frontend builder",
  "S6 - designer": "T4 - frontend builder",
  "M10 - critic": "T4 - frontend builder",
  "shokunin-designer": "T4 - frontend builder",
  "frontend-ui-ux": "T4 - frontend builder",

  // Builder/Backend variants → "D5 - backend builder"
  "Sisyphus-Junior": "D5 - backend builder",
  "sisyphus-junior": "D5 - backend builder",
  "J1 - junior": "D5 - backend builder",
  "H3 - bulk builder": "D5 - backend builder",
  "F1 - fast builder": "D5 - backend builder",
  "W7 - writer": "D5 - backend builder",
  "hayai-builder": "D5 - backend builder",
  builder: "D5 - backend builder",

  // Already v4 names - passthrough
  build: "build",
  Musashi: "Musashi",
  "Musashi - boulder": "Musashi - boulder",
  "Musashi - plan": "Musashi - plan",
  "K9 - advisor": "K9 - advisor",
  "R2 - researcher": "R2 - researcher",
  "X1 - explorer": "X1 - explorer",
  "T4 - frontend builder": "T4 - frontend builder",
  "D5 - backend builder": "D5 - backend builder",
}

export const BUILTIN_AGENT_NAMES = new Set([
  "Musashi",
  "Musashi - boulder",
  "Musashi - plan",
  "K9 - advisor",
  "R2 - researcher",
  "X1 - explorer",
  "T4 - frontend builder",
  "D5 - backend builder",
  "build",
  // Legacy names for backward compatibility
  "sisyphus",
  "oracle",
  "librarian",
  "explore",
  "multimodal-looker",
  "metis",
  "momus",
  "prometheus",
  "atlas",
])

// Migration map: old hook names → new hook names (for backward compatibility)
// null means the hook was removed and should be filtered out from disabled_hooks
export const HOOK_NAME_MAP: Record<string, string | null> = {
  // Legacy names (backward compatibility)
  "anthropic-auto-compact": "anthropic-context-window-limit-recovery",
  "sisyphus-orchestrator": "atlas",

  // Removed hooks (v3.0.0) - will be filtered out and user warned
  "preemptive-compaction": null,
  "empty-message-sanitizer": null,
}

/**
 * @deprecated LEGACY MIGRATION ONLY
 * 
 * This map exists solely for migrating old configs that used hardcoded model strings.
 * It maps legacy model strings to semantic category names, allowing users to migrate
 * from explicit model configs to category-based configs.
 * 
 * DO NOT add new entries here. New agents should use:
 * - Category-based config (preferred): { category: "unspecified-high" }
 * - Or inherit from OpenCode's config.model
 * 
 * This map will be removed in a future major version once migration period ends.
 */
export const MODEL_TO_CATEGORY_MAP: Record<string, string> = {
  "google/gemini-3-pro": "visual-engineering",
  "google/gemini-3-flash": "writing",
  "openai/gpt-5.2": "ultrabrain",
  "anthropic/claude-haiku-4-5": "quick",
  "anthropic/claude-opus-4-5": "unspecified-high",
  "anthropic/claude-sonnet-4-5": "unspecified-low",
}

export function migrateAgentNames(agents: Record<string, unknown>): { migrated: Record<string, unknown>; changed: boolean } {
  const migrated: Record<string, unknown> = {}
  let changed = false

  for (const [key, value] of Object.entries(agents)) {
    const newKey = AGENT_NAME_MAP[key.toLowerCase()] ?? AGENT_NAME_MAP[key] ?? key
    if (newKey !== key) {
      changed = true
    }
    migrated[newKey] = value
  }

  return { migrated, changed }
}

export function migrateHookNames(hooks: string[]): { migrated: string[]; changed: boolean; removed: string[] } {
  const migrated: string[] = []
  const removed: string[] = []
  let changed = false

  for (const hook of hooks) {
    const mapping = HOOK_NAME_MAP[hook]

    if (mapping === null) {
      removed.push(hook)
      changed = true
      continue
    }

    const newHook = mapping ?? hook
    if (newHook !== hook) {
      changed = true
    }
    migrated.push(newHook)
  }

  return { migrated, changed, removed }
}

export function migrateAgentConfigToCategory(config: Record<string, unknown>): {
  migrated: Record<string, unknown>
  changed: boolean
} {
  const { model, ...rest } = config
  if (typeof model !== "string") {
    return { migrated: config, changed: false }
  }

  const category = MODEL_TO_CATEGORY_MAP[model]
  if (!category) {
    return { migrated: config, changed: false }
  }

  return {
    migrated: { category, ...rest },
    changed: true,
  }
}

export function shouldDeleteAgentConfig(
  config: Record<string, unknown>,
  category: string
): boolean {
  const { DEFAULT_CATEGORIES } = require("../tools/delegate-task/constants")
  const defaults = DEFAULT_CATEGORIES[category]
  if (!defaults) return false

  const keys = Object.keys(config).filter((k) => k !== "category")
  if (keys.length === 0) return true

  for (const key of keys) {
    if (config[key] !== (defaults as Record<string, unknown>)[key]) {
      return false
    }
  }
  return true
}

export function migrateConfigFile(configPath: string, rawConfig: Record<string, unknown>): boolean {
  let needsWrite = false

  if (rawConfig.agents && typeof rawConfig.agents === "object") {
    const { migrated, changed } = migrateAgentNames(rawConfig.agents as Record<string, unknown>)
    if (changed) {
      rawConfig.agents = migrated
      needsWrite = true
    }
  }



  if (rawConfig.omo_agent) {
    rawConfig.sisyphus_agent = rawConfig.omo_agent
    delete rawConfig.omo_agent
    needsWrite = true
  }

  if (rawConfig.disabled_agents && Array.isArray(rawConfig.disabled_agents)) {
    const migrated: string[] = []
    let changed = false
    for (const agent of rawConfig.disabled_agents as string[]) {
      const newAgent = AGENT_NAME_MAP[agent.toLowerCase()] ?? AGENT_NAME_MAP[agent] ?? agent
      if (newAgent !== agent) {
        changed = true
      }
      migrated.push(newAgent)
    }
    if (changed) {
      rawConfig.disabled_agents = migrated
      needsWrite = true
    }
  }

  if (rawConfig.disabled_hooks && Array.isArray(rawConfig.disabled_hooks)) {
    const { migrated, changed, removed } = migrateHookNames(rawConfig.disabled_hooks as string[])
    if (changed) {
      rawConfig.disabled_hooks = migrated
      needsWrite = true
    }
    if (removed.length > 0) {
      log(`Removed obsolete hooks from disabled_hooks: ${removed.join(", ")} (these hooks no longer exist in v3.0.0)`)
    }
  }

  if (needsWrite) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const backupPath = `${configPath}.bak.${timestamp}`
      fs.copyFileSync(configPath, backupPath)

      fs.writeFileSync(configPath, JSON.stringify(rawConfig, null, 2) + "\n", "utf-8")
      log(`Migrated config file: ${configPath} (backup: ${backupPath})`)
    } catch (err) {
      log(`Failed to write migrated config to ${configPath}:`, err)
    }
  }

  return needsWrite
}
