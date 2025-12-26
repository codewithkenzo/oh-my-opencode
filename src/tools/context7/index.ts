import { tool } from "@opencode-ai/plugin/tool"

const CONTEXT7_BASE = "https://context7.com/api"

interface Library {
  id: string
  name: string
  description: string
  codeSnippets: number
  trustLevel: string
}

interface DocsResponse {
  content: string
  source: string
}

export const context7_resolve_library_id = tool({
  description: `Resolves a package/product name to a Context7-compatible library ID and returns a list of matching libraries.

You MUST call this function before 'get-library-docs' to obtain a valid Context7-compatible library ID UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

Selection Process:
1. Analyze the query to understand what library/package the user is looking for
2. Return the most relevant match based on:
- Name similarity to the query (exact matches prioritized)
- Description relevance to the query's intent
- Documentation coverage (prioritize libraries with higher Code Snippet counts)
- Source reputation (consider libraries with High or Medium reputation more authoritative)
- Benchmark Score: Quality indicator (100 is the highest score)

Response Format:
- Return the selected library ID in a clearly marked section
- Provide a brief explanation for why this library was chosen
- If multiple good matches exist, acknowledge this but proceed with the most relevant one
- If no good matches exist, clearly state this and suggest query refinements

For ambiguous queries, request clarification before proceeding with a best-guess match.`,
  args: {
    libraryName: tool.schema.string().describe("Library name to search for and retrieve a Context7-compatible library ID."),
  },
  execute: async (args) => {
    try {
      const response = await fetch(`${CONTEXT7_BASE}/search?q=${encodeURIComponent(args.libraryName)}`, {
        headers: { "Accept": "application/json" }
      })
      
      if (!response.ok) {
        return `Error: Context7 API returned ${response.status}`
      }
      
      const data = await response.json() as { libraries?: Library[] }
      
      if (!data.libraries || data.libraries.length === 0) {
        return `No libraries found for "${args.libraryName}". Try a different search term.`
      }
      
      const results = data.libraries.slice(0, 5).map((lib, i) => 
        `${i + 1}. **${lib.name}** (${lib.id})\n   ${lib.description}\n   Snippets: ${lib.codeSnippets} | Trust: ${lib.trustLevel}`
      ).join("\n\n")
      
      return `## Libraries Found\n\n${results}\n\n**Recommended**: Use library ID \`${data.libraries[0].id}\` with context7_get_library_docs`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const context7_get_library_docs = tool({
  description: `Fetches up-to-date documentation for a library. You must call 'resolve-library-id' first to obtain the exact Context7-compatible library ID required to use this tool, UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query. Use mode='code' (default) for API references and code examples, or mode='info' for conceptual guides, narrative information, and architectural questions.`,
  args: {
    context7CompatibleLibraryID: tool.schema.string().describe("Exact Context7-compatible library ID (e.g., '/mongodb/docs', '/vercel/next.js', '/supabase/supabase', '/vercel/next.js/v14.3.0-canary.87') retrieved from 'resolve-library-id' or directly from user query in the format '/org/project' or '/org/project/version'."),
    topic: tool.schema.string().optional().describe("Topic to focus documentation on (e.g., 'hooks', 'routing')."),
    mode: tool.schema.enum(["code", "info"]).optional().describe("Documentation mode: 'code' for API references and code examples (default), 'info' for conceptual guides, narrative information, and architectural questions."),
    page: tool.schema.number().optional().describe("Page number for pagination (start: 1, default: 1). If the context is not sufficient, try page=2, page=3, page=4, etc. with the same topic."),
  },
  execute: async (args) => {
    try {
      const params = new URLSearchParams()
      if (args.topic) params.set("topic", args.topic)
      if (args.mode) params.set("mode", args.mode)
      if (args.page) params.set("page", String(args.page))
      
      const url = `${CONTEXT7_BASE}/docs${args.context7CompatibleLibraryID}?${params}`
      const response = await fetch(url, {
        headers: { "Accept": "application/json" }
      })
      
      if (!response.ok) {
        return `Error: Context7 API returned ${response.status}`
      }
      
      const data = await response.json() as DocsResponse
      return data.content || "No documentation content returned."
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})