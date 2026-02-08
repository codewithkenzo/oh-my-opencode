import { tool } from "@opencode-ai/plugin/tool"
import {
  CIVITAI_SEARCH_DESCRIPTION,
  CIVITAI_GET_DESCRIPTION,
  CIVITAI_TAGS_DESCRIPTION,
} from "./constants"

export const civitai_searchDef = {
  description: CIVITAI_SEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().optional().describe("Search models by name"),
    tag: tool.schema.string().optional().describe("Filter by tag"),
    username: tool.schema.string().optional().describe("Filter by creator username"),
    types: tool.schema
      .array(tool.schema.enum(["Checkpoint", "TextualInversion", "Hypernetwork", "AestheticGradient", "LORA", "Controlnet", "Poses"]))
      .optional()
      .describe("Filter by model types"),
    sort: tool.schema
      .enum(["Highest Rated", "Most Downloaded", "Newest"])
      .optional()
      .describe("Sort order"),
    period: tool.schema
      .enum(["AllTime", "Year", "Month", "Week", "Day"])
      .optional()
      .describe("Time period for stats"),
    nsfw: tool.schema.boolean().optional().describe("Include NSFW models"),
    limit: tool.schema.number().optional().describe("Results per page (1-100, default 20)"),
    page: tool.schema.number().optional().describe("Page number"),
  },
}

export const civitai_getDef = {
  description: CIVITAI_GET_DESCRIPTION,
  args: {
    id: tool.schema.number().describe("Model ID"),
  },
}

export const civitai_tagsDef = {
  description: CIVITAI_TAGS_DESCRIPTION,
  args: {
    query: tool.schema.string().optional().describe("Filter tags by name"),
    limit: tool.schema.number().optional().describe("Results per page (1-200, default 20)"),
    page: tool.schema.number().optional().describe("Page number"),
  },
}

export const civitaiToolDefs = {
  civitai_search: civitai_searchDef,
  civitai_get: civitai_getDef,
  civitai_tags: civitai_tagsDef,
}
