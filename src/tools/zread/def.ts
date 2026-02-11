import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import {
  TOOL_DESCRIPTION_SEARCH,
  TOOL_DESCRIPTION_FILE,
  TOOL_DESCRIPTION_STRUCTURE,
} from "./constants"

const zread_searchDef: { description: string; args: ToolDefinition["args"] } = {
  description: TOOL_DESCRIPTION_SEARCH,
  args: {
    repo: tool.schema.string().describe("GitHub repository in 'owner/repo' format"),
    query: tool.schema.string().describe("Search query for docs, code, issues"),
    language: tool.schema.enum(["en", "zh"]).optional().describe("Response language"),
  },
}

const zread_fileDef: { description: string; args: ToolDefinition["args"] } = {
  description: TOOL_DESCRIPTION_FILE,
  args: {
    repo: tool.schema.string().describe("GitHub repository in 'owner/repo' format"),
    path: tool.schema.string().describe("File path within the repo"),
  },
}

const zread_structureDef: { description: string; args: ToolDefinition["args"] } = {
  description: TOOL_DESCRIPTION_STRUCTURE,
  args: {
    repo: tool.schema.string().describe("GitHub repository in 'owner/repo' format"),
    path: tool.schema.string().optional().describe("Subdirectory path to inspect"),
  },
}

export const zreadToolDefs = {
  zread_search: zread_searchDef,
  zread_file: zread_fileDef,
  zread_structure: zread_structureDef,
}
