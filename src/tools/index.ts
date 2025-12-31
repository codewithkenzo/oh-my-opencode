import {
  lsp_hover,
  lsp_goto_definition,
  lsp_find_references,
  lsp_document_symbols,
  lsp_workspace_symbols,
  lsp_diagnostics,
  lsp_servers,
  lsp_prepare_rename,
  lsp_rename,
  lsp_code_actions,
  lsp_code_action_resolve,
} from "./lsp"

import {
  ast_grep_search,
  ast_grep_replace,
} from "./ast-grep"

import { grep } from "./grep"
import { glob } from "./glob"
import { slashcommand } from "./slashcommand"

import {
  session_list,
  session_read,
  session_search,
  session_info,
} from "./session-manager"


import { context7_resolve_library_id, context7_get_library_docs, context7_query_docs } from './context7'

import { grep_app_searchGitHub } from './grep-app'

import { websearch as exa_websearch } from './exa'

import { glare } from './glare'

import { codesearch as exa_codesearch } from './codesearch'

import { webfetch } from './webfetch'

import { multiedit } from './multiedit'

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
} from './raindrop'

export { interactive_bash, startBackgroundCheck as startTmuxCheck } from "./interactive-bash"
export { getTmuxPath } from "./interactive-bash/utils"

import {
  createBackgroundTask,
  createBackgroundOutput,
  createBackgroundCancel,
} from "./background-task"

import type { PluginInput } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../features/background-agent"

type OpencodeClient = PluginInput["client"]

export { createCallOmoAgent } from "./call-omo-agent"
export { createLookAt } from "./look-at"

export function createBackgroundTools(manager: BackgroundManager, client: OpencodeClient) {
  return {
    background_task: createBackgroundTask(manager),
    background_output: createBackgroundOutput(manager, client),
    background_cancel: createBackgroundCancel(manager, client),
  }
}

export const builtinTools = {
  lsp_hover,
  lsp_goto_definition,
  lsp_find_references,
  lsp_document_symbols,
  lsp_workspace_symbols,
  lsp_diagnostics,
  lsp_servers,
  lsp_prepare_rename,
  lsp_rename,
  lsp_code_actions,
  lsp_code_action_resolve,
  ast_grep_search,
  ast_grep_replace,
  grep,
  glob,
  slashcommand,
  session_list,
  session_read,
  session_search,
  session_info,
  context7_resolve_library_id,
  context7_get_library_docs,
  context7_query_docs,
  grep_app_searchGitHub,
  exa_websearch,
  glare,
  exa_codesearch,
  webfetch,
  multiedit,
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
}
