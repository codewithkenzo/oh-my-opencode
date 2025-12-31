import type { Model, ModelsResponse, TagsResponse } from "./types"

export function formatModel(model: Model): string {
  const lines: string[] = []
  
  lines.push(`## ${model.name}`)
  lines.push(`**ID**: ${model.id} | **Type**: ${model.type}`)
  
  if (model.creator) {
    lines.push(`**Creator**: ${model.creator.username}`)
  }
  
  if (model.stats) {
    const { downloadCount, favoriteCount, rating } = model.stats
    const ratingStr = rating != null ? ` | ${rating.toFixed(1)} rating` : ""
    lines.push(`**Stats**: ${(downloadCount ?? 0).toLocaleString()} downloads | ${(favoriteCount ?? 0).toLocaleString()} favorites${ratingStr}`)
  }
  
  if (model.tags && model.tags.length > 0) {
    lines.push(`**Tags**: ${model.tags.join(", ")}`)
  }
  
  if (model.description) {
    const cleanDesc = model.description
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 500)
    if (cleanDesc) {
      lines.push(`\n${cleanDesc}${model.description.length > 500 ? "..." : ""}`)
    }
  }
  
  if (model.modelVersions && model.modelVersions.length > 0) {
    lines.push(`\n### Versions (${model.modelVersions.length})`)
    for (const version of model.modelVersions.slice(0, 5)) {
      const baseModel = version.baseModel ? ` (${version.baseModel})` : ""
      lines.push(`- **${version.name}**${baseModel}`)
      if (version.trainedWords && version.trainedWords.length > 0) {
        lines.push(`  Trigger words: \`${version.trainedWords.join("`, `")}\``)
      }
    }
    if (model.modelVersions.length > 5) {
      lines.push(`- ... and ${model.modelVersions.length - 5} more versions`)
    }
  }
  
  lines.push(`\n**URL**: https://civitai.com/models/${model.id}`)
  
  return lines.join("\n")
}

export function formatModelsResponse(response: ModelsResponse): string {
  if (!response.items || response.items.length === 0) {
    return "No models found."
  }
  
  const lines: string[] = []
  
  if (response.metadata) {
    const { totalItems, currentPage, totalPages } = response.metadata
    if (totalItems !== undefined) {
      lines.push(`**Found ${totalItems.toLocaleString()} models** (page ${currentPage ?? 1} of ${totalPages ?? 1})\n`)
    }
  }
  
  for (const model of response.items) {
    lines.push(`### ${model.name}`)
    lines.push(`ID: ${model.id} | Type: ${model.type}`)
    
    if (model.stats) {
      const ratingStr = model.stats.rating != null ? ` | Rating: ${model.stats.rating.toFixed(1)}` : ""
      lines.push(`Downloads: ${(model.stats.downloadCount ?? 0).toLocaleString()}${ratingStr}`)
    }
    
    if (model.tags && model.tags.length > 0) {
      lines.push(`Tags: ${model.tags.slice(0, 5).join(", ")}${model.tags.length > 5 ? "..." : ""}`)
    }
    
    lines.push(`https://civitai.com/models/${model.id}\n`)
  }
  
  return lines.join("\n")
}

export function formatTagsResponse(response: TagsResponse): string {
  if (!response.items || response.items.length === 0) {
    return "No tags found."
  }
  
  const lines: string[] = []
  
  if (response.metadata?.totalItems) {
    lines.push(`**Found ${response.metadata.totalItems.toLocaleString()} tags**\n`)
  }
  
  lines.push("| Tag | Models |")
  lines.push("|-----|--------|")
  
  for (const tag of response.items) {
    const count = tag.modelCount ?? 0
    lines.push(`| ${tag.name} | ${count.toLocaleString()} |`)
  }
  
  return lines.join("\n")
}
