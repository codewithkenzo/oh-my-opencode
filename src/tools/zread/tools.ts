import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import {
  TOOL_DESCRIPTION_SEARCH,
  TOOL_DESCRIPTION_FILE,
  TOOL_DESCRIPTION_STRUCTURE,
} from "./constants"
import { callZreadTool } from "./client"
import { unescapeZreadOutput, formatError } from "./formatters"

export const zread_search: ToolDefinition = tool({
  description: TOOL_DESCRIPTION_SEARCH,
  args: {
    repo: tool.schema.string().describe("GitHub repository in 'owner/repo' format"),
    query: tool.schema.string().describe("Search query for docs, code, issues"),
    language: tool.schema.enum(["en", "zh"]).optional().describe("Response language"),
  },
  async execute(args) {
    try {
      const result = await callZreadTool("search_doc", {
        repo_name: args.repo,
        query: args.query,
        language: args.language ?? "en",
      })
      return unescapeZreadOutput(result)
    } catch (error) {
      return formatError(error)
    }
  },
})

export const zread_file: ToolDefinition = tool({
  description: TOOL_DESCRIPTION_FILE,
  args: {
    repo: tool.schema.string().describe("GitHub repository in 'owner/repo' format"),
    path: tool.schema.string().describe("File path within the repo"),
  },
  async execute(args) {
    try {
      const result = await callZreadTool("read_file", {
        repo_name: args.repo,
        file_path: args.path,
      })
      return unescapeZreadOutput(result)
    } catch (error) {
      return formatError(error)
    }
  },
})

export const zread_structure: ToolDefinition = tool({
  description: TOOL_DESCRIPTION_STRUCTURE,
  args: {
    repo: tool.schema.string().describe("GitHub repository in 'owner/repo' format"),
    path: tool.schema.string().optional().describe("Subdirectory path to inspect"),
  },
  async execute(args) {
    try {
      const apiArgs: Record<string, string> = { repo_name: args.repo }
      if (args.path) apiArgs.dir_path = args.path

      const result = await callZreadTool("get_repo_structure", apiArgs)
      return unescapeZreadOutput(result)
    } catch (error) {
      return formatError(error)
    }
  },
})
