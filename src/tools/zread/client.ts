import { API_URL_SSE } from "./constants"
import type {
  ZreadSearchResult,
  ZreadStructureResult,
  ZreadFileResult,
} from "./types"

interface SSEMessage {
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

async function callMCPToolSSE<T>(
  toolName: string,
  args: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.ZAI_API_KEY

  if (!apiKey) {
    throw new Error("ZAI_API_KEY environment variable not set. Please set ZAI_API_KEY to use Zread tools.")
  }

  const sseUrl = `${API_URL_SSE}?Authorization=${apiKey}`
  
  const initResponse = await fetch(sseUrl, {
    method: "GET",
    headers: {
      "Accept": "text/event-stream",
    },
  })

  if (!initResponse.ok) {
    throw new Error(`Zread SSE init failed: ${initResponse.status} ${initResponse.statusText}`)
  }

  const sessionEndpoint = initResponse.headers.get("x-session-endpoint")
  if (!sessionEndpoint) {
    const body = await initResponse.text()
    const match = body.match(/endpoint:\s*(\S+)/)
    if (!match) {
      throw new Error("Could not establish SSE session - no endpoint returned")
    }
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

  const response = await fetch(sseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Zread API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

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
    
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6).trim()
        if (jsonStr && jsonStr !== "[DONE]") {
          try {
            const msg: SSEMessage = JSON.parse(jsonStr)
            
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
  path?: string,
): Promise<ZreadSearchResult> {
  return callMCPToolSSE<ZreadSearchResult>("search_doc", { repo, query, path })
}

export async function getRepoStructure(
  repo: string,
  path?: string,
): Promise<ZreadStructureResult> {
  return callMCPToolSSE<ZreadStructureResult>("get_repo_structure", { repo, path })
}

export async function readFile(
  repo: string,
  path: string,
): Promise<ZreadFileResult> {
  return callMCPToolSSE<ZreadFileResult>("read_file", { repo, path })
}
