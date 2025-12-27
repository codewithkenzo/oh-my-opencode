import { tool } from "@opencode-ai/plugin/tool"

const CONTEXT7_API_BASE = "https://context7.com/api"

interface SearchResult {
  id: string
  title: string
  description: string
  totalSnippets?: number
  trustScore?: number
  benchmarkScore?: number
  versions?: string[]
}

interface SearchResponse {
  results?: SearchResult[]
  error?: string
}

function getSourceReputationLabel(trustScore?: number): string {
  if (trustScore === undefined || trustScore < 0) return "Unknown"
  if (trustScore >= 7) return "High"
  if (trustScore >= 4) return "Medium"
  return "Low"
}

function formatSearchResults(results: SearchResult[]): string {
  if (!results || results.length === 0) {
    return "No documentation libraries found matching your query."
  }

  return results.map(result => {
    const lines = [
      `- Title: ${result.title}`,
      `- Context7-compatible library ID: ${result.id}`,
      `- Description: ${result.description}`,
    ]

    if (result.totalSnippets !== undefined && result.totalSnippets !== -1) {
      lines.push(`- Code Snippets: ${result.totalSnippets}`)
    }

    lines.push(`- Source Reputation: ${getSourceReputationLabel(result.trustScore)}`)

    if (result.benchmarkScore !== undefined && result.benchmarkScore > 0) {
      lines.push(`- Benchmark Score: ${result.benchmarkScore}`)
    }

    if (result.versions && result.versions.length > 0) {
      lines.push(`- Versions: ${result.versions.join(", ")}`)
    }

    return lines.join("\n")
  }).join("\n----------\n")
}

export const context7_resolve_library_id = tool({
  description: `Resolves a package/product name to a Context7-compatible library ID and returns matching libraries.

You MUST call this function before 'context7_query_docs' to obtain a valid Context7-compatible library ID UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

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

For ambiguous queries, request clarification before proceeding with a best-guess match.

IMPORTANT: Do not call this tool more than 3 times per question. If you cannot find what you need after 3 calls, use the best result you have.`,
  args: {
    query: tool.schema.string().describe("The user's original question or task. This is used to rank library results by relevance to what the user is trying to accomplish. IMPORTANT: Do not include any sensitive or confidential information such as API keys, passwords, credentials, or personal data in your query."),
    libraryName: tool.schema.string().describe("Library name to search for and retrieve a Context7-compatible library ID."),
  },
  execute: async (args) => {
    try {
      const url = new URL(`${CONTEXT7_API_BASE}/v2/libs/search`)
      url.searchParams.set("query", args.query)
      url.searchParams.set("libraryName", args.libraryName)

      const response = await fetch(url.toString(), {
        headers: {
          "X-Context7-Source": "oh-my-opencode",
        },
      })

      if (!response.ok) {
        if (response.status === 429) {
          return "Rate limited or quota exceeded. Create a free API key at https://context7.com/dashboard for higher limits."
        }
        return `Error: Context7 returned ${response.status}`
      }

      const data = await response.json() as SearchResponse

      if (!data.results || data.results.length === 0) {
        return data.error || "No libraries found matching the provided name."
      }

      const resultsText = formatSearchResults(data.results)

      return `Available Libraries:

Each result includes:
- Library ID: Context7-compatible identifier (format: /org/project)
- Name: Library or package name
- Description: Short summary
- Code Snippets: Number of available code examples
- Source Reputation: Authority indicator (High, Medium, Low, or Unknown)
- Benchmark Score: Quality indicator (100 is the highest score)
- Versions: List of versions if available. Use one of those versions if the user provides a version in their query.

For best results, select libraries based on name match, source reputation, snippet coverage, benchmark score, and relevance to your use case.

----------

${resultsText}`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const context7_query_docs = tool({
  description: `Retrieves and queries up-to-date documentation and code examples from Context7 for any programming library or framework.

You must call 'context7_resolve_library_id' first to obtain the exact Context7-compatible library ID required to use this tool, UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

IMPORTANT: Do not call this tool more than 3 times per question. If you cannot find what you need after 3 calls, use the best information you have.`,
  args: {
    libraryId: tool.schema.string().describe("Exact Context7-compatible library ID (e.g., '/mongodb/docs', '/vercel/next.js', '/supabase/supabase', '/vercel/next.js/v14.3.0-canary.87') retrieved from 'context7_resolve_library_id' or directly from user query in the format '/org/project' or '/org/project/version'."),
    query: tool.schema.string().describe("The question or task you need help with. Be specific and include relevant details. Good: 'How to set up authentication with JWT in Express.js' or 'React useEffect cleanup function examples'. Bad: 'auth' or 'hooks'. IMPORTANT: Do not include any sensitive or confidential information such as API keys, passwords, credentials, or personal data in your query."),
  },
  execute: async (args) => {
    try {
      const url = new URL(`${CONTEXT7_API_BASE}/v2/context`)
      url.searchParams.set("query", args.query)
      url.searchParams.set("libraryId", args.libraryId)

      const response = await fetch(url.toString(), {
        headers: {
          "X-Context7-Source": "oh-my-opencode",
        },
      })

      if (!response.ok) {
        if (response.status === 429) {
          return "Rate limited or quota exceeded. Create a free API key at https://context7.com/dashboard for higher limits."
        }
        if (response.status === 404) {
          return "The library you are trying to access does not exist. Please try with a different library ID."
        }
        return `Error: Context7 returned ${response.status}`
      }

      const text = await response.text()

      if (!text) {
        return "Documentation not found or not finalized for this library. This might have happened because you used an invalid Context7-compatible library ID. To get a valid Context7-compatible library ID, use 'context7_resolve_library_id' with the package name you wish to retrieve documentation for."
      }

      return text
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

// Keep backward compatibility alias
export const context7_get_library_docs = context7_query_docs
