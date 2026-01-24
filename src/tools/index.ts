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

import {
  ast_grep_search,
  ast_grep_replace,
} from "./ast-grep"

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

import {
  createBackgroundOutput,
  createBackgroundCancel,
} from "./background-task"

import type { PluginInput, ToolDefinition } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../features/background-agent"

// Custom tools - raindrop (ripple)
import {
  ripple_collections,
  ripple_search,
  ripple_get,
  ripple_create,
  ripple_tags,
  ripple_tag_add,
  ripple_tag_remove,
  ripple_bulk_create,
  ripple_bulk_update,
  ripple_delete,
  ripple_bulk_delete,
  ripple_suggest,
} from "./raindrop"

// Custom tools - runware
import {
  runwareGenerate,
  runwareRemoveBg,
  runwareUpscale,
  runwareModelSearch,
  runwareImg2Img,
  runwareVideoGenerate,
  runwareVideoFromImage,
} from "./runware"

// Custom tools - syncthing
import {
  syncthing_status,
  syncthing_folders,
  syncthing_folder_add,
  syncthing_folder_remove,
  syncthing_folder_pause,
  syncthing_folder_rescan,
  syncthing_devices,
  syncthing_device_add,
  syncthing_device_remove,
  syncthing_share,
  syncthing_unshare,
  syncthing_ignores_get,
  syncthing_ignores_set,
  syncthing_versioning,
  syncthing_connections,
} from "./syncthing"

// Custom tools - ticket
import {
  ticket_ready,
  ticket_list,
  ticket_show,
  ticket_create,
  ticket_start,
  ticket_close,
  ticket_dep,
  ticket_undep,
  ticket_blocked,
} from "./ticket"

// Custom tools - civitai
import {
  civitai_search,
  civitai_get,
  civitai_tags,
} from "./civitai"

// Custom tools - zread
import { zread_search, zread_file, zread_structure } from "./zread"

// Research tools - exa, context7, grep-app, webfetch
import { websearch as exa_websearch } from "./exa"
import { codesearch as exa_codesearch } from "./codesearch"
import { context7_resolve_library_id, context7_query_docs } from "./context7"
import { grep_app_searchGitHub } from "./grep-app"
import { webfetch } from "./webfetch"

// Custom tools - agent-browser
import { browserTools } from "./agent-browser"

// Custom tools - system-notify
import { system_notify } from "./system-notify"
export { sendSystemNotification } from "./system-notify"

// Custom tools - supermemory
import { createSupermemoryTool } from "./supermemory"
export { createSupermemoryTool }

type OpencodeClient = PluginInput["client"]

export { createCallOmoAgent } from "./call-omo-agent"
export { createLookAt } from "./look-at"
export { createDelegateTask, type DelegateTaskToolOptions, DEFAULT_CATEGORIES, CATEGORY_PROMPT_APPENDS } from "./delegate-task"

export function createBackgroundTools(manager: BackgroundManager, client: OpencodeClient): Record<string, ToolDefinition> {
  return {
    background_output: createBackgroundOutput(manager, client),
    background_cancel: createBackgroundCancel(manager, client),
  }
}

export const builtinTools: Record<string, ToolDefinition> = {
  lsp_goto_definition,
  lsp_find_references,
  lsp_symbols,
  lsp_diagnostics,
  lsp_prepare_rename,
  lsp_rename,
  ast_grep_search,
  ast_grep_replace,
  grep,
  glob,
  session_list,
  session_read,
  session_search,
  session_info,
  ripple_collections,
  ripple_search,
  ripple_get,
  ripple_create,
  ripple_tags,
  ripple_tag_add,
  ripple_tag_remove,
  ripple_bulk_create,
  ripple_bulk_update,
  ripple_delete,
  ripple_bulk_delete,
  ripple_suggest,
  runwareGenerate,
  runwareRemoveBg,
  runwareUpscale,
  runwareModelSearch,
  runwareImg2Img,
  runwareVideoGenerate,
  runwareVideoFromImage,
  syncthing_status,
  syncthing_folders,
  syncthing_folder_add,
  syncthing_folder_remove,
  syncthing_folder_pause,
  syncthing_folder_rescan,
  syncthing_devices,
  syncthing_device_add,
  syncthing_device_remove,
  syncthing_share,
  syncthing_unshare,
  syncthing_ignores_get,
  syncthing_ignores_set,
  syncthing_versioning,
  syncthing_connections,
  ticket_ready,
  ticket_list,
  ticket_show,
  ticket_create,
  ticket_start,
  ticket_close,
  ticket_dep,
  ticket_undep,
  ticket_blocked,
  civitai_search,
  civitai_get,
  civitai_tags,
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
  multiedit,
  ...browserTools,
}
