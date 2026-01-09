import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"

const CODESEARCH_DESCRIPTION = `Search and get relevant context for any programming task using Exa Code API. Provides the highest quality and freshest context for libraries, SDKs, and APIs. Use this tool for ANY question or task related to programming. Returns comprehensive code examples, documentation, and API references.

Usage notes:
  - Adjustable token count (1000-50000) for focused or comprehensive results
  - Default 5000 tokens provides balanced context for most queries
  - Use lower values for specific questions, higher values for comprehensive documentation
  - Supports queries about frameworks, libraries, APIs, and programming concepts
  - Examples: 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware'`

const EXA_MCP = "https://mcp.exa.ai/mcp"

interface McpResponse {
  result?: {
    content?: Array<{ type: string; text: string }>
  }
  error?: {
    code: number
    message: string
  }
}

export const codesearch: ToolDefinition = tool({
  description: CODESEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().describe(
      "Search query to find relevant context for APIs, Libraries, and SDKs. For example, 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware', 'Next js partial prerendering configuration'"
    ),
    tokensNum: tool.schema.number().min(1000).max(50000).optional().describe(
      "Number of tokens to return (1000-50000). Default is 5000 tokens. Adjust this value based on how much context you need - use lower values for focused queries and higher values for comprehensive documentation."
    ),
  },
  execute: async (args) => {
    try {
      const response = await fetch(EXA_MCP, {
        method: "POST",
        headers: {
          "Accept": "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "get_code_context_exa",
            arguments: {
              query: args.query,
              tokensNum: args.tokensNum || 5000,
            },
          },
          id: Date.now(),
        }),
      })

      if (!response.ok) {
        return `Error: Exa returned ${response.status}`
      }

      const text = await response.text()
      const lines = text.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6)
          try {
            const data = JSON.parse(jsonStr) as McpResponse
            if (data.error) {
              return `Error: ${data.error.message}`
            }
            if (data.result?.content?.[0]?.text) {
              return data.result.content[0].text
            }
          } catch {
            continue
          }
        }
      }

      return "No code snippets or documentation found. Please try a different query, be more specific about the library or programming concept, or check the spelling of framework names."
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})
