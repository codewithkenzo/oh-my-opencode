import { tool } from "@opencode-ai/plugin/tool"
import { UNIFIED_MODEL_SEARCH_DESCRIPTION } from "./constants"

export const unifiedModelSearchDef = {
  description: UNIFIED_MODEL_SEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().describe("Search query for model name or keyword"),
    source: tool.schema
      .enum(["all", "civitai", "runware"])
      .optional()
      .describe("Which source to search: 'all' (default), 'civitai', or 'runware'"),
    category: tool.schema
      .string()
      .optional()
      .describe("Filter by category (e.g. 'Checkpoint', 'LORA' for Civitai; 'checkpoint', 'lora' for Runware)"),
    architecture: tool.schema
      .string()
      .optional()
      .describe("Filter by architecture (e.g. 'SDXL 1.0', 'SD 1.5', 'Flux.1 D')"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Max results per source (default 10)"),
  },
}

export const unifiedModelSearchToolDefs = {
  unified_model_search: unifiedModelSearchDef,
} as const
