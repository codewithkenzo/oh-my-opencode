import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"

const context7_resolve_library_idDef: { description: string; args: ToolDefinition["args"] } = {
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
}

const context7_query_docsDef: { description: string; args: ToolDefinition["args"] } = {
  description: `Retrieves and queries up-to-date documentation and code examples from Context7 for any programming library or framework.

You must call 'context7_resolve_library_id' first to obtain the exact Context7-compatible library ID required to use this tool, UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

IMPORTANT: Do not call this tool more than 3 times per question. If you cannot find what you need after 3 calls, use the best information you have.`,
  args: {
    libraryId: tool.schema.string().describe("Exact Context7-compatible library ID (e.g., '/mongodb/docs', '/vercel/next.js', '/supabase/supabase', '/vercel/next.js/v14.3.0-canary.87') retrieved from 'context7_resolve_library_id' or directly from user query in the format '/org/project' or '/org/project/version'."),
    query: tool.schema.string().describe("The question or task you need help with. Be specific and include relevant details. Good: 'How to set up authentication with JWT in Express.js' or 'React useEffect cleanup function examples'. Bad: 'auth' or 'hooks'. IMPORTANT: Do not include any sensitive or confidential information such as API keys, passwords, credentials, or personal data in your query."),
  },
}

export const context7ToolDefs = {
  context7_resolve_library_id: context7_resolve_library_idDef,
  context7_query_docs: context7_query_docsDef,
}
