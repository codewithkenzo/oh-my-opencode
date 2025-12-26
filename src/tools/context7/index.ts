import { tool } from "@opencode-ai/plugin/tool"

const CONTEXT7_MCP = "https://mcp.context7.com/mcp"

interface McpResponse {
  result?: {
    content?: Array<{ type: string; text: string }>
  }
  error?: {
    code: number
    message: string
  }
}

async function callContext7(method: string, args: Record<string, unknown>): Promise<string> {
  const response = await fetch(CONTEXT7_MCP, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: method,
        arguments: args,
      },
      id: Date.now(),
    }),
  })

  if (!response.ok) {
    return `Error: Context7 returned ${response.status}`
  }

  const data = await response.json() as McpResponse

  if (data.error) {
    return `Error: ${data.error.message}`
  }

  if (data.result?.content?.[0]?.text) {
    return data.result.content[0].text
  }

  return "No content returned from Context7"
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
      return await callContext7("resolve-library-id", { libraryName: args.libraryName })
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
      const mcpArgs: Record<string, unknown> = {
        context7CompatibleLibraryID: args.context7CompatibleLibraryID,
      }
      if (args.topic) mcpArgs.topic = args.topic
      if (args.mode) mcpArgs.mode = args.mode
      if (args.page) mcpArgs.page = args.page

      return await callContext7("get-library-docs", mcpArgs)
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})