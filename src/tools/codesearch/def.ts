import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"

const CODESEARCH_DESCRIPTION = `Search and get relevant context for any programming task using Exa Code API. Provides the highest quality and freshest context for libraries, SDKs, and APIs. Use this tool for ANY question or task related to programming. Returns comprehensive code examples, documentation, and API references.

Usage notes:
  - Adjustable token count (1000-50000) for focused or comprehensive results
  - Default 5000 tokens provides balanced context for most queries
  - Use lower values for specific questions, higher values for comprehensive documentation
  - Supports queries about frameworks, libraries, APIs, and programming concepts
  - Examples: 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware'`

const exa_codesearchDef: { description: string; args: ToolDefinition["args"] } = {
  description: CODESEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().describe(
      "Search query to find relevant context for APIs, Libraries, and SDKs. For example, 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware', 'Next js partial prerendering configuration'"
    ),
    tokensNum: tool.schema.number().min(1000).max(50000).optional().describe(
      "Number of tokens to return (1000-50000). Default is 5000 tokens. Adjust this value based on how much context you need - use lower values for focused queries and higher values for comprehensive documentation."
    ),
  },
}

export const codesearchToolDefs = {
  exa_codesearch: exa_codesearchDef,
}
