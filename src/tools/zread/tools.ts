import { tool } from "@opencode-ai/plugin/tool"
import {
  TOOL_DESCRIPTION_SEARCH,
  TOOL_DESCRIPTION_STRUCTURE,
  TOOL_DESCRIPTION_FILE,
} from "./constants"
import { searchRepo, getRepoStructure, readFile } from "./client"
import { formatSearchResult, formatStructureResult, formatFileResult, formatError } from "./formatters"

export const zread_search = tool({
  description: TOOL_DESCRIPTION_SEARCH,
  args: {
    repo: tool.schema
      .string()
      .describe("GitHub repository URL or owner/repo (e.g. 'facebook/react')"),
    query: tool.schema
      .string()
      .describe("Search query for docs, code, comments in the repository"),
    path: tool.schema
      .string()
      .optional()
      .describe("Optional path filter to search within specific directory"),
  },
  async execute(args, _context) {
    try {
      const result = await searchRepo(args.repo, args.query, args.path)
      return formatSearchResult(result)
    } catch (error) {
      return formatError(error)
    }
  },
})

export const zread_structure = tool({
  description: TOOL_DESCRIPTION_STRUCTURE,
  args: {
    repo: tool.schema
      .string()
      .describe("GitHub repository URL or owner/repo (e.g. 'facebook/react')"),
    path: tool.schema
      .string()
      .optional()
      .describe("Optional path to get structure for specific directory"),
  },
  async execute(args, _context) {
    try {
      const result = await getRepoStructure(args.repo, args.path)
      return formatStructureResult(result)
    } catch (error) {
      return formatError(error)
    }
  },
})

export const zread_file = tool({
  description: TOOL_DESCRIPTION_FILE,
  args: {
    repo: tool.schema
      .string()
      .describe("GitHub repository URL or owner/repo (e.g. 'facebook/react')"),
    path: tool.schema
      .string()
      .describe("Path to the file in the repository (e.g. 'src/index.ts')"),
  },
  async execute(args, _context) {
    try {
      const result = await readFile(args.repo, args.path)
      return formatFileResult(result)
    } catch (error) {
      return formatError(error)
    }
  },
})
