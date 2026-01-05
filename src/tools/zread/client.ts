import { API_URL } from "./constants"
import type { McpResponse } from "./types"

let sessionId: string | null = null
let sessionExpiry = 0
const SESSION_TTL = 5 * 60 * 1000

function getApiKey(): string {
  const apiKey = process.env.ZAI_API_KEY
  if (!apiKey) {
    throw new Error("ZAI_API_KEY environment variable not set")
  }
  return apiKey
}

async function initSession(): Promise<string> {
  const apiKey = getApiKey()

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "oh-my-opencode", version: "1.0" },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Zread init failed: ${response.status}`)
  }

  const newSessionId = response.headers.get("mcp-session-id")
  if (!newSessionId) {
    throw new Error("No session ID returned from Zread API")
  }

  sessionId = newSessionId
  sessionExpiry = Date.now() + SESSION_TTL
  return sessionId
}

async function ensureSession(): Promise<string> {
  if (sessionId && Date.now() < sessionExpiry) {
    return sessionId
  }
  return await initSession()
}

function parseSSEResponse(text: string): string {
  const lines = text.split("\n")
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const jsonStr = line.slice(5)
      try {
        const data = JSON.parse(jsonStr) as McpResponse

        if (data.error) {
          throw new Error(`Zread error: ${data.error.message}`)
        }

        if (data.result?.content?.[0]?.text) {
          return data.result.content[0].text
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Zread error")) {
          throw e
        }
      }
    }
  }
  throw new Error("No result from Zread API")
}

export async function callZreadTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const session = await ensureSession()
  const apiKey = getApiKey()

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${apiKey}`,
      "Mcp-Session-Id": session,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      sessionId = null
      const newSession = await ensureSession()

      const retryResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Authorization": `Bearer ${apiKey}`,
          "Mcp-Session-Id": newSession,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: toolName, arguments: args },
        }),
      })

      if (!retryResponse.ok) {
        throw new Error(`Zread API error: ${retryResponse.status}`)
      }

      const text = await retryResponse.text()
      return parseSSEResponse(text)
    }

    throw new Error(`Zread API error: ${response.status}`)
  }

  const text = await response.text()
  return parseSSEResponse(text)
}
