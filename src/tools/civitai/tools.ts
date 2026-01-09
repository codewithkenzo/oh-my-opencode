import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import {
  CIVITAI_SEARCH_DESCRIPTION,
  CIVITAI_GET_DESCRIPTION,
  CIVITAI_TAGS_DESCRIPTION,
} from "./constants"
import { searchModels, getModel, searchTags } from "./client"
import { formatModelsResponse, formatModel, formatTagsResponse } from "./formatters"

export const civitai_search: ToolDefinition = tool({
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
  async execute(params) {
    try {
      const response = await searchModels({
        query: params.query,
        tag: params.tag,
        username: params.username,
        types: params.types,
        sort: params.sort,
        period: params.period,
        nsfw: params.nsfw,
        limit: params.limit,
        page: params.page,
      })
      return formatModelsResponse(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return `Error searching Civitai: ${message}`
    }
  },
})

export const civitai_get: ToolDefinition = tool({
  description: CIVITAI_GET_DESCRIPTION,
  args: {
    id: tool.schema.number().describe("Model ID"),
  },
  async execute({ id }) {
    try {
      const model = await getModel({ id })
      return formatModel(model)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return `Error fetching model: ${message}`
    }
  },
})

export const civitai_tags: ToolDefinition = tool({
  description: CIVITAI_TAGS_DESCRIPTION,
  args: {
    query: tool.schema.string().optional().describe("Filter tags by name"),
    limit: tool.schema.number().optional().describe("Results per page (1-200, default 20)"),
    page: tool.schema.number().optional().describe("Page number"),
  },
  async execute(params) {
    try {
      const response = await searchTags({
        query: params.query,
        limit: params.limit,
        page: params.page,
      })
      return formatTagsResponse(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return `Error searching tags: ${message}`
    }
  },
})
