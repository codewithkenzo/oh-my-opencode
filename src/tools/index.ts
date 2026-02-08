import {
  lsp_goto_definition,
  lsp_find_references,
  lsp_symbols,
  lsp_diagnostics,
  lsp_prepare_rename,
  lsp_rename,
  lspManager,
} from "./lsp"

export { lspManager }

import { grep } from "./grep"
import { glob } from "./glob"
import { multiedit } from "./multiedit"
export { createSlashcommandTool, discoverCommandsSync } from "./slashcommand"

import {
  session_list,
  session_read,
  session_search,
  session_info,
} from "./session-manager"

export { sessionExists } from "./session-manager/storage"

export { interactive_bash, startBackgroundCheck as startTmuxCheck } from "./interactive-bash"
export { createSkillTool, createFindSkillsTool } from "./skill"
export { getTmuxPath } from "./interactive-bash/utils"
export { createSkillMcpTool } from "./skill-mcp"
export { createMcpQueryTool } from "./mcp-query"

import {
  createBackgroundOutput,
  createBackgroundCancel,
} from "./background-task"

import type { PluginInput, ToolDefinition } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../features/background-agent"
import { createLazyTool } from "./lazy-tool-wrapper"
import { TOOL_PROFILES, getToolsForProfiles } from "./tool-profiles"
import type { ToolProfile } from "./tool-profiles"

import { astGrepToolDefs } from "./ast-grep/def"
import { browserToolDefs } from "./agent-browser/def"
import { raindropToolDefs } from "./raindrop/def"
import { runwareToolDefs } from "./runware/def"
import { syncthingToolDefs } from "./syncthing/def"
import { ticketToolDefs } from "./ticket/def"
import { civitaiToolDefs } from "./civitai/def"
import { unifiedModelSearchToolDefs } from "./unified-model-search/def"

import { zread_search, zread_file, zread_structure } from "./zread"
import { websearch as exa_websearch } from "./exa"
import { codesearch as exa_codesearch } from "./codesearch"
import { context7_resolve_library_id, context7_query_docs } from "./context7"
import { grep_app_searchGitHub } from "./grep-app"
import { webfetch } from "./webfetch"

import { system_notify } from "./system-notify"
export { sendSystemNotification } from "./system-notify"

import { createSupermemoryTool } from "./supermemory"
export { createSupermemoryTool }

type OpencodeClient = PluginInput["client"]

export { createHybridTool, DEFAULT_TOOL_ROUTES, getToolRouteConfig, getRoutePolicyForServer } from "./hybrid-router"
export type { ToolRoutePolicy, ToolRouteConfig, ToolRoutingMap, HybridToolOptions, HybridToolResult } from "./hybrid-router"
export { createCallOmoAgent } from "./call-omo-agent"
export { createLookAt } from "./look-at"
export { createDelegateTask, type DelegateTaskToolOptions, DEFAULT_CATEGORIES, CATEGORY_PROMPT_APPENDS } from "./delegate-task"
export { createLazyTool } from "./lazy-tool-wrapper"
export type { LazyToolOptions } from "./lazy-tool-wrapper"
export { TOOL_PROFILES, TOOL_TO_PROFILE, getToolProfile, getToolsForProfile, getToolsForProfiles } from "./tool-profiles"
export type { ToolProfile } from "./tool-profiles"

export function createBackgroundTools(manager: BackgroundManager, client: OpencodeClient): Record<string, ToolDefinition> {
  return {
    background_output: createBackgroundOutput(manager, client),
    background_cancel: createBackgroundCancel(manager, client),
  }
}

const eagerTools: Record<string, ToolDefinition> = {
  lsp_goto_definition,
  lsp_find_references,
  lsp_symbols,
  lsp_diagnostics,
  lsp_prepare_rename,
  lsp_rename,
  grep,
  glob,
  multiedit,
  session_list,
  session_read,
  session_search,
  session_info,
  zread_search,
  zread_file,
  zread_structure,
  exa_websearch,
  exa_codesearch,
  context7_resolve_library_id,
  context7_query_docs,
  grep_app_searchGitHub,
  webfetch,
  system_notify,
}

interface LazyToolEntry {
  def: { description: string; args: ToolDefinition["args"] }
  loader: () => Promise<ToolDefinition>
}

function buildLazyRegistry(): Record<string, LazyToolEntry> {
  const registry: Record<string, LazyToolEntry> = {}

  for (const [name, def] of Object.entries(astGrepToolDefs)) {
    registry[name] = {
      def,
      loader: () => import("./ast-grep/tools").then(m => (m as Record<string, ToolDefinition>)[name]),
    }
  }

  for (const [name, def] of Object.entries(browserToolDefs)) {
    registry[name] = {
      def,
      loader: () => import("./agent-browser/tools").then(m => m.browserTools[name] as ToolDefinition),
    }
  }

  for (const [name, def] of Object.entries(raindropToolDefs)) {
    registry[name] = {
      def,
      loader: () => import("./raindrop/tools").then(m => m.rippleTools[name]),
    }
  }

  for (const [name, def] of Object.entries(runwareToolDefs)) {
    registry[name] = {
      def,
      loader: () => import("./runware/tools").then(m => (m as Record<string, ToolDefinition>)[name]),
    }
  }

  for (const [name, def] of Object.entries(syncthingToolDefs)) {
    registry[name] = {
      def,
      loader: () => import("./syncthing/tools").then(m => m.syncthingTools[name]),
    }
  }

  for (const [name, def] of Object.entries(ticketToolDefs)) {
    registry[name] = {
      def,
      loader: () => import("./ticket/tools").then(m => m.ticketTools[name]),
    }
  }

  for (const [name, def] of Object.entries(civitaiToolDefs)) {
    registry[name] = {
      def,
      loader: () => import("./civitai/tools").then(m => (m as Record<string, ToolDefinition>)[name]),
    }
  }

  registry.unified_model_search = {
    def: unifiedModelSearchToolDefs.unified_model_search,
    loader: () => import("./unified-model-search/tools").then(m => m.unified_model_search),
  }

  return registry
}

const lazyToolRegistry = buildLazyRegistry()

export const builtinTools: Record<string, ToolDefinition> = {
  ...eagerTools,
  ...Object.fromEntries(
    Object.entries(lazyToolRegistry).map(([name, entry]) => [
      name,
      createLazyTool({
        name,
        description: entry.def.description,
        args: entry.def.args,
        loader: entry.loader,
      }),
    ]),
  ),
}

export function createBuiltinToolsWithLazyLoading(opts?: {
  onFirstLoad?: (name: string, loadTimeMs: number) => void
  activeProfiles?: ToolProfile[]
}): Record<string, ToolDefinition> {
  const activeToolNames = opts?.activeProfiles
    ? getToolsForProfiles(opts.activeProfiles)
    : new Set(TOOL_PROFILES.core)

  const result: Record<string, ToolDefinition> = { ...eagerTools }

  for (const [name, entry] of Object.entries(lazyToolRegistry)) {
    result[name] = createLazyTool({
      name,
      description: entry.def.description,
      args: entry.def.args,
      loader: entry.loader,
      onFirstLoad: opts?.onFirstLoad,
    })
  }

  return result
}
