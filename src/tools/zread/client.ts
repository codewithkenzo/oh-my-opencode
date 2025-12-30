import { API_URL } from "./constants"
import type {
  ZreadSearchResult,
  ZreadStructureResult,
  ZreadFileResult,
  ZreadErrorResponse,
} from "./types"

interface MCPResponse<T> {
  result?: T
  error?: ZreadErrorResponse
}

async function callMCPTool<T>(
  toolName: string,
  args: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.ZAI_API_KEY

  if (!apiKey) {
    throw new Error("ZAI_API_KEY environment variable not set. Please set ZAI_API_KEY to use Zread tools.")
  }

  const payload = {
    method: "tools/call",
    params: {
      name: toolName,
      args,
    },
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Zread API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = (await response.json()) as MCPResponse<T>

  if (data.error) {
    throw new Error(`Zread API error: ${data.error.error}${data.error.code ? ` (code: ${data.error.code})` : ""}`)
  }

  if (!data.result) {
    throw new Error("No result returned from Zread API")
  }

  return data.result
}

export async function searchRepo(
  repo: string,
  query: string,
  path?: string,
): Promise<ZreadSearchResult> {
  return callMCPTool<ZreadSearchResult>("search_doc", { repo, query, path })
}

export async function getRepoStructure(
  repo: string,
  path?: string,
): Promise<ZreadStructureResult> {
  return callMCPTool<ZreadStructureResult>("get_repo_structure", { repo, path })
}

export async function readFile(
  repo: string,
  path: string,
): Promise<ZreadFileResult> {
  return callMCPTool<ZreadFileResult>("read_file", { repo, path })
}
