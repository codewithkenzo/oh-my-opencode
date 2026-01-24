import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"

const WEBSEARCH_DESCRIPTION = `Search the web using Exa AI - performs real-time web searches and can scrape content from specific URLs. Supports configurable result counts and returns the content from the most relevant websites.

Usage notes:
  - Supports live crawling modes: 'fallback' (backup if cached unavailable) or 'preferred' (prioritize live crawling)
  - Search types: 'auto' (balanced), 'fast' (quick results), 'deep' (comprehensive search)
  - Configurable context length for optimal LLM integration
  - Domain filtering and advanced search options available`

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

export const websearch: ToolDefinition = tool({
  description: WEBSEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().describe("Websearch query"),
    numResults: tool.schema.number().optional().describe("Number of search results to return (default: 8)"),
    livecrawl: tool.schema.enum(["fallback", "preferred"]).optional().describe("Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')"),
    type: tool.schema.enum(["auto", "fast", "deep"]).optional().describe("Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search"),
    contextMaxCharacters: tool.schema.number().optional().describe("Maximum characters for context string optimized for LLMs (default: 10000)"),
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
            name: "web_search_exa",
            arguments: {
              query: args.query,
              type: args.type || "auto",
              numResults: args.numResults || 8,
              livecrawl: args.livecrawl || "fallback",
              contextMaxCharacters: args.contextMaxCharacters ?? 10000,
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

      return "No search results found. Please try a different query."
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})
