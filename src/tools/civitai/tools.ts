import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { searchModels, getModel, searchTags } from "./client"
import { formatModelsResponse, formatModel, formatTagsResponse } from "./formatters"
import { civitai_searchDef, civitai_getDef, civitai_tagsDef } from "./def"

export const civitai_search: ToolDefinition = tool({
  ...civitai_searchDef,
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
  ...civitai_getDef,
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
  ...civitai_tagsDef,
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
