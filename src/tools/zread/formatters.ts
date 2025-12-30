import type { ZreadSearchResult, ZreadStructureResult, ZreadFileResult } from "./types"

export function formatSearchResult(result: ZreadSearchResult): string {
  if (result.results.length === 0) {
    return `No results found for query.\n`
  }

  const lines = result.results.map((r) => {
    const location = r.line ? `:${r.line}` : ""
    const relevance = r.relevance ? ` (relevance: ${r.relevance.toFixed(2)})` : ""
    return `**${r.file}${location}**${relevance}\n\`\`\`\n${r.snippet}\n\`\`\`\n`
  })

  return `Found ${result.results.length} result(s):\n\n${lines.join("\n")}`
}

export function formatStructureResult(result: ZreadStructureResult, indent: number = 0): string {
  const prefix = "  ".repeat(indent)
  const icon = result.type === "directory" ? "📁 " : "📄 "

  let output = `${prefix}${icon} **${result.name}**\n`

  if (result.children && result.children.length > 0) {
    output += result.children.map((child) => formatStructureResult(child, indent + 1)).join("\n")
  }

  return output
}

export function formatFileResult(result: ZreadFileResult): string {
  const lines = `**File:** ${result.path}\n\n`
  const content = `\`\`\`\`\n${result.content}\n\`\`\`\`\n`

  return lines + content
}

export function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error occurred"
  return `Error: ${message}`
}
