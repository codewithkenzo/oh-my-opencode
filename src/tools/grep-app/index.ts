import { tool } from "@opencode-ai/plugin/tool"

const GREP_APP_MCP = "https://mcp.grep.app"
const GREP_APP_API = "https://grep.app/api/search"

interface McpResponse {
  result?: {
    content?: Array<{ type: string; text: string }>
    isError?: boolean
  }
  error?: {
    code: number
    message: string
  }
}

interface DirectApiResponse {
  hits: {
    total: number
    hits: Array<{
      repo: string
      path: string
      content: { snippet: string }
    }>
  }
  facets?: unknown
}

function isRateLimitError(text: string): boolean {
  return text.includes("Too Many R") || text.includes("429") || text.includes("rate limit")
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
}

async function tryMcpEndpoint(args: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(GREP_APP_MCP, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/event-stream",
      "Content-Type": "application/json",
      "User-Agent": "oh-my-opencode/grep-app-tool",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "searchGitHub",
        arguments: args,
      },
      id: Date.now(),
    }),
  })

  if (!response.ok) {
    if (response.status === 429) {
      return null
    }
    return `Error: grep.app returned ${response.status}`
  }

  const text = await response.text()

  if (isRateLimitError(text)) {
    return null
  }

  const lines = text.split('\n')
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.slice(6)
      try {
        const data = JSON.parse(jsonStr) as McpResponse

        if (data.result?.isError && data.result?.content?.[0]?.text) {
          const errorText = data.result.content[0].text
          if (isRateLimitError(errorText)) {
            return null
          }
          return `Error: ${errorText}`
        }

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

  return "No results from grep.app"
}

async function callDirectApi(args: Record<string, unknown>): Promise<string> {
  const params = new URLSearchParams({ q: args.query as string })

  if (args.language) {
    const langs = args.language as string[]
    params.set('lang', langs.join(','))
  }
  if (args.repo) params.set('repo', args.repo as string)
  if (args.path) params.set('path', args.path as string)
  if (args.useRegexp) params.set('regexp', 'true')
  if (args.matchCase) params.set('case', 'true')
  if (args.matchWholeWords) params.set('words', 'true')

  const response = await fetch(`${GREP_APP_API}?${params}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'oh-my-opencode/grep-app-tool',
    }
  })

  if (!response.ok) {
    return `Error: grep.app returned ${response.status}`
  }

  const data = await response.json() as DirectApiResponse
  return formatDirectApiResponse(data)
}

function formatDirectApiResponse(data: DirectApiResponse): string {
  const hits = data.hits?.hits || []
  const total = data.hits?.total || 0

  if (hits.length === 0) {
    return `No results found. (total: ${total})`
  }

  const formatted = hits.map((hit, index) => {
    const snippet = stripHtmlTags(hit.content?.snippet || "")
    return `[${index + 1}] ${hit.repo}/${hit.path}
${snippet}`
  }).join('\n\n')

  return `Found ${total} results (showing first ${hits.length}):

${formatted}`
}

async function callGrepApp(args: Record<string, unknown>): Promise<string> {
  const mcpResult = await tryMcpEndpoint(args)

  if (mcpResult !== null) {
    return mcpResult
  }

  process.stderr.write("[grep.app] MCP rate limited, using direct API\n")
  return await callDirectApi(args)
}

export const grep_app_searchGitHub = tool({
  description: `Find real-world code examples from over a million public GitHub repositories to help answer programming questions.

**IMPORTANT: This tool searches for literal code patterns (like grep), not keywords. Search for actual code that would appear in files:**
- ✅ Good: 'useState(', 'import React from', 'async function', '(?s)try {.*await'
- ❌ Bad: 'react tutorial', 'best practices', 'how to use'

**When to use this tool:**
- When implementing unfamiliar APIs or libraries and need to see real usage patterns
- When unsure about correct syntax, parameters, or configuration for a specific library
- When looking for production-ready examples and best practices for implementation
- When needing to understand how different libraries or frameworks work together

**Perfect for questions like:**
- "How do developers handle authentication in Next.js apps?" → Search: 'getServerSession' with language=['TypeScript', 'TSX']
- "What are common React error boundary patterns?" → Search: 'ErrorBoundary' with language=['TSX']
- "Show me real useEffect cleanup examples" → Search: '(?s)useEffect\\(\\(\\) => {.*removeEventListener' with useRegexp=true
- "How do developers handle CORS in Flask applications?" → Search: 'CORS(' with matchCase=true and language=['Python']

Use regular expressions with useRegexp=true for flexible patterns like '(?s)useState\\(.*loading' to find useState hooks with loading-related variables. Prefix the pattern with '(?s)' to match across multiple lines.

Filter by language, repository, or file path to narrow results.`,
  args: {
    query: tool.schema.string().describe("The literal code pattern to search for (e.g., 'useState(', 'export function'). Use actual code that would appear in files, not keywords or questions."),
    language: tool.schema.array(tool.schema.string()).optional().describe("Filter by programming language. Examples: ['TypeScript', 'TSX'], ['JavaScript'], ['Python'], ['Java'], ['C#'], ['Markdown'], ['YAML']"),
    repo: tool.schema.string().optional().describe("Filter by repository. Examples: 'facebook/react', 'microsoft/vscode', 'vercel/ai'. Can match partial names, for example 'vercel/' will find repositories in the vercel org."),
    path: tool.schema.string().optional().describe("Filter by file path. Examples: 'src/components/Button.tsx', 'README.md'. Can match partial paths, for example '/route.ts' will find route.ts files at any level."),
    useRegexp: tool.schema.boolean().optional().describe("Whether to interpret the query as a regular expression"),
    matchCase: tool.schema.boolean().optional().describe("Whether the search should be case sensitive"),
    matchWholeWords: tool.schema.boolean().optional().describe("Whether to match whole words only"),
  },
  execute: async (args) => {
    try {
      const mcpArgs: Record<string, unknown> = { query: args.query }
      if (args.language) mcpArgs.language = args.language
      if (args.repo) mcpArgs.repo = args.repo
      if (args.path) mcpArgs.path = args.path
      if (args.useRegexp) mcpArgs.useRegexp = args.useRegexp
      if (args.matchCase) mcpArgs.matchCase = args.matchCase
      if (args.matchWholeWords) mcpArgs.matchWholeWords = args.matchWholeWords

      return await callGrepApp(mcpArgs)
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})
