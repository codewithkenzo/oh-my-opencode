import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"

const WEBSEARCH_DESCRIPTION = `Search the web using Exa AI - performs real-time web searches and can scrape content from specific URLs. Supports configurable result counts and returns the content from the most relevant websites.

Usage notes:
  - Supports live crawling modes: 'fallback' (backup if cached unavailable) or 'preferred' (prioritize live crawling)
  - Search types: 'auto' (balanced), 'fast' (quick results), 'deep' (comprehensive search)
  - Configurable context length for optimal LLM integration
  - Domain filtering and advanced search options available`

const exa_websearchDef: { description: string; args: ToolDefinition["args"] } = {
  description: WEBSEARCH_DESCRIPTION,
  args: {
    query: tool.schema.string().describe("Websearch query"),
    numResults: tool.schema.number().optional().describe("Number of search results to return (default: 8)"),
    livecrawl: tool.schema.enum(["fallback", "preferred"]).optional().describe("Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')"),
    type: tool.schema.enum(["auto", "fast", "deep"]).optional().describe("Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search"),
    contextMaxCharacters: tool.schema.number().optional().describe("Maximum characters for context string optimized for LLMs (default: 10000)"),
  },
}

export const exaToolDefs = {
  exa_websearch: exa_websearchDef,
}
