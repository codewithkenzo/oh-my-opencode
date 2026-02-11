import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"

const grep_app_searchGitHubDef: { description: string; args: ToolDefinition["args"] } = {
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
}

export const grepAppToolDefs = {
  grep_app_searchGitHub: grep_app_searchGitHubDef,
}
