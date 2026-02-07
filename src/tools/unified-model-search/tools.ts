import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { UNIFIED_MODEL_SEARCH_DESCRIPTION } from "./constants"
import { searchModels as searchCivitai } from "../civitai/client"
import { searchModels as searchRunware } from "../runware/client"
import type { Model } from "../civitai/types"

interface UnifiedModelResult {
  source: "civitai" | "runware"
  name: string
  airId: string
  category: string
  architecture?: string
  tags?: string[]
  stats?: {
    downloads?: number
    rating?: number
    favorites?: number
  }
  trainedWords?: string[]
}

function normalizeCivitaiResults(items: Model[]): UnifiedModelResult[] {
  return items.map((model) => {
    const latestVersion = model.modelVersions?.[0]
    const airId = latestVersion
      ? `civitai:${model.id}@${latestVersion.id}`
      : `civitai:${model.id}`

    return {
      source: "civitai" as const,
      name: model.name,
      airId,
      category: model.type,
      architecture: latestVersion?.baseModel,
      tags: model.tags,
      stats: model.stats
        ? {
            downloads: model.stats.downloadCount,
            rating: model.stats.rating,
            favorites: model.stats.favoriteCount,
          }
        : undefined,
      trainedWords: latestVersion?.trainedWords,
    }
  })
}

function normalizeRunwareResults(
  results: Array<{ name: string; modelID: string; category: string; architecture: string }>,
): UnifiedModelResult[] {
  return results.map((r) => ({
    source: "runware" as const,
    name: r.name,
    airId: r.modelID,
    category: r.category,
    architecture: r.architecture,
  }))
}

function formatResults(results: UnifiedModelResult[], errors: string[]): string {
  const lines: string[] = []

  if (errors.length > 0) {
    lines.push(`**Partial results** (${errors.length} source(s) failed):`)
    for (const err of errors) {
      lines.push(`- ${err}`)
    }
    lines.push("")
  }

  if (results.length === 0) {
    lines.push("No models found matching your query.")
    return lines.join("\n")
  }

  lines.push(`Found **${results.length}** model(s):\n`)

  for (const model of results) {
    lines.push(`### ${model.name}`)
    lines.push(`- **Source**: ${model.source}`)
    lines.push(`- **AIR ID**: \`${model.airId}\``)
    lines.push(`- **Category**: ${model.category}`)
    if (model.architecture) {
      lines.push(`- **Architecture**: ${model.architecture}`)
    }
    if (model.tags && model.tags.length > 0) {
      lines.push(`- **Tags**: ${model.tags.join(", ")}`)
    }
    if (model.stats) {
      const statParts: string[] = []
      if (model.stats.downloads !== undefined) statParts.push(`${model.stats.downloads} downloads`)
      if (model.stats.rating !== undefined) statParts.push(`${model.stats.rating.toFixed(1)} rating`)
      if (model.stats.favorites !== undefined) statParts.push(`${model.stats.favorites} favorites`)
      if (statParts.length > 0) {
        lines.push(`- **Stats**: ${statParts.join(" | ")}`)
      }
    }
    if (model.trainedWords && model.trainedWords.length > 0) {
      lines.push(`- **Trained Words**: ${model.trainedWords.join(", ")}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

export const unified_model_search: ToolDefinition = tool({
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
  async execute(params) {
    const source = params.source || "all"
    const limit = params.limit || 10
    const errors: string[] = []
    let allResults: UnifiedModelResult[] = []

    const searchCivitaiSource = source === "all" || source === "civitai"
    const searchRunwareSource = source === "all" || source === "runware"

    const promises: Array<Promise<void>> = []

    if (searchCivitaiSource) {
      promises.push(
        searchCivitai({
          query: params.query,
          types: params.category
            ? [params.category as "Checkpoint" | "TextualInversion" | "Hypernetwork" | "AestheticGradient" | "LORA" | "Controlnet" | "Poses"]
            : undefined,
          limit,
        })
          .then((response) => {
            allResults = allResults.concat(normalizeCivitaiResults(response.items))
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err)
            errors.push(`Civitai: ${msg}`)
          }),
      )
    }

    if (searchRunwareSource) {
      promises.push(
        searchRunware({
          query: params.query,
          category: params.category?.toLowerCase(),
          architecture: params.architecture,
          limit,
        })
          .then((response) => {
            allResults = allResults.concat(normalizeRunwareResults(response.results))
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err)
            errors.push(`Runware: ${msg}`)
          }),
      )
    }

    await Promise.allSettled(promises)

    return formatResults(allResults, errors)
  },
})
