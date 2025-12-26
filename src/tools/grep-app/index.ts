import { tool } from "@opencode-ai/plugin/tool"

const GREP_APP_BASE = "https://grep.app/api"

interface SearchResult {
  repo: string
  path: string
  content: string
  line: number
}

interface SearchResponse {
  results?: SearchResult[]
  total?: number
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
    language: tool.schema.array(tool.schema.string()).optional().describe("Filter by programming language. Examples: ['TypeAssistant', 'TSX'], ['JavaScript'], ['Python'], ['Java'], ['C#'], ['Markdown'], ['YAML']"),
    repo: tool.schema.string().optional().describe("Filter by repository. Examples: 'facebook/react', 'microsoft/vscode', 'vercel/ai'. Can match partial names, for example 'vercel/' will find repositories in the vercel org."),
    path: tool.schema.string().optional().describe("Filter by file path. Examples: 'src/components/Button.tsx', 'README.md'. Can match partial paths, for example '/route.ts' will find route.ts files at any level."),
    useRegexp: tool.schema.boolean().optional().describe("Whether to interpret the query as a regular expression"),
    matchCase: tool.schema.boolean().optional().describe("Whether the search should be case sensitive"),
    matchWholeWords: tool.schema.boolean().optional().describe("Whether to match whole words only"),
  },
  execute: async (args) => {
    try {
      const params = new URLSearchParams()
      params.set("q", args.query)
      if (args.useRegexp) params.set("regexp", "true")
      if (args.matchCase) params.set("case", "true")
      if (args.matchWholeWords) params.set("words", "true")
      if (args.repo) params.set("repo", args.repo)
      if (args.path) params.set("path", args.path)
      if (args.language) {
        args.language.forEach(lang => params.append("lang", lang))
      }
      
      const response = await fetch(`${GREP_APP_BASE}/search?${params}`, {
        headers: { 
          "Accept": "application/json",
          "User-Agent": "OpenCode/1.0"
        }
      })
      
      if (!response.ok) {
        return `Error: grep.app API returned ${response.status}`
      }
      
      const data = await response.json() as SearchResponse
      
      if (!data.results || data.results.length === 0) {
        return `No results found for "${args.query}". Try:\n- A different search pattern\n- Removing language/repo filters\n- Using useRegexp=true for flexible matching`
      }
      
      const results = data.results.slice(0, 10).map((r, i) => 
        `### ${i + 1}. ${r.repo}\n**File**: \`${r.path}\` (line ${r.line})\n\`\`\`\n${r.content.slice(0, 500)}\n\`\`\``
      ).join("\n\n")
      
      return `## Found ${data.total || data.results.length} results\n\n${results}`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})