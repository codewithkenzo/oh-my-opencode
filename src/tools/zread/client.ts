import { API_URL } from "./constants"
import type {
  ZreadSearchResult,
  ZreadStructureResult,
  ZreadFileResult,
} from "./types"

interface MCPResponse {
  jsonrpc?: string
  id?: number
  result?: {
    content?: Array<{ type: string; text?: string }>
  }
  error?: {
    code: number
    message: string
  }
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
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Zread API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  // Handle streaming response
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("No response body from Zread API")
  }

  const decoder = new TextDecoder()
  let buffer = ""
  let result: T | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    
    // Try to parse complete JSON objects from buffer
    // The API may stream multiple JSON objects
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const msg: MCPResponse = JSON.parse(trimmed)
        
        if (msg.error) {
          throw new Error(`Zread API error: ${msg.error.message} (code: ${msg.error.code})`)
        }
        
        if (msg.result?.content) {
          const textContent = msg.result.content.find(c => c.type === "text")
          if (textContent?.text) {
            try {
              result = JSON.parse(textContent.text) as T
            } catch {
              // If not JSON, use as-is
              result = textContent.text as unknown as T
            }
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Zread API error")) {
          throw e
        }
        // Ignore parse errors for incomplete chunks
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    try {
      const msg: MCPResponse = JSON.parse(buffer.trim())
      
      if (msg.error) {
        throw new Error(`Zread API error: ${msg.error.message} (code: ${msg.error.code})`)
      }
      
      if (msg.result?.content) {
        const textContent = msg.result.content.find(c => c.type === "text")
        if (textContent?.text) {
          try {
            result = JSON.parse(textContent.text) as T
          } catch {
            result = textContent.text as unknown as T
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Zread API error")) {
        throw e
      }
    }
  }

  if (!result) {
    throw new Error("No result returned from Zread API")
  }

  return result
}

export async function searchRepo(
  repo: string,
  query: string,
  language?: string,
): Promise<ZreadSearchResult> {
  return callMCPTool<ZreadSearchResult>("search_doc", { 
    repo_name: repo, 
    query,
    language: language ?? "en",
  })
}

export async function getRepoStructure(
  repo: string,
  path?: string,
): Promise<ZreadStructureResult> {
  const args: Record<string, string> = { repo_name: repo }
  if (path) args.dir_path = path
  return callMCPTool<ZreadStructureResult>("get_repo_structure", args)
}

export async function readFile(
  repo: string,
  path: string,
): Promise<ZreadFileResult> {
  return callMCPTool<ZreadFileResult>("read_file", { repo_name: repo, file_path: path })
}
