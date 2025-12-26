import { extractPromptText } from "../keyword-detector/detector"
import { execSync } from "child_process"

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

// Patterns that indicate user preferences
const PREFERENCE_PATTERNS = [
  /always use/i,
  /never use/i,
  /i prefer/i,
  /don't.*ever/i,
  /make sure to/i,
  /remember that/i,
  /from now on/i,
  /i like/i,
  /i hate/i,
  /i want/i,
]

// Patterns for procedural knowledge (commands, workflows)
const PROCEDURAL_PATTERNS = [
  /how to/i,
  /the way to/i,
  /you can.*by/i,
  /run.*command/i,
]

type MemoryCollection = "semantic" | "episodic" | "procedural" | "emotional" | "reflective"

function storeMemory(content: string, collection: MemoryCollection = "semantic"): void {
  if (!content || content.length < 10) return
  try {
    const sanitized = content.replace(/"/g, '\\"').replace(/\n/g, ' ').slice(0, 500)
    execSync(
      `bun ${MEMORY_CLI_PATH} add "${sanitized}" --collection=${collection}`,
      { encoding: "utf-8", timeout: 10000, stdio: "pipe" }
    )
  } catch {
    // Silently fail - don't interrupt user flow
  }
}

function isPreferenceMessage(content: string): boolean {
  return PREFERENCE_PATTERNS.some((p) => p.test(content))
}

function isProceduralMessage(content: string): boolean {
  return PROCEDURAL_PATTERNS.some((p) => p.test(content))
}

// Track session for summaries
const sessionData = new Map<string, {
  toolCalls: string[]
  errors: number
  filesModified: Set<string>
}>()

export function createMemoryCaptureHook() {
  return {
    "chat.message": async (
      input: {
        sessionID: string
        agent?: string
        model?: { providerID: string; modelID: string }
        messageID?: string
      },
      output: {
        message: Record<string, unknown>
        parts: Array<{ type: string; text?: string; [key: string]: unknown }>
      }
    ): Promise<void> => {
      const content = extractPromptText(output.parts)
      const role = (output.message as any)?.role
      
      // Initialize session tracking
      if (!sessionData.has(input.sessionID)) {
        sessionData.set(input.sessionID, {
          toolCalls: [],
          errors: 0,
          filesModified: new Set()
        })
      }
      
      // Capture user preferences
      if (role === "user" && isPreferenceMessage(content)) {
        storeMemory(content, "semantic")
      }
      
      // Capture procedural knowledge from assistant
      if (role === "assistant" && isProceduralMessage(content)) {
        storeMemory(content, "procedural")
      }
    },

    "tool.result": async (
      input: { sessionID: string; tool: string },
      output: { result: string }
    ): Promise<void> => {
      const session = sessionData.get(input.sessionID)
      if (session) {
        session.toolCalls.push(input.tool)
        
        // Track file modifications
        if (["edit", "write"].includes(input.tool)) {
          // Could extract file path from result
        }
      }
      
      // Capture successful bash commands as procedural memory
      if (input.tool === "bash" && output.result && !output.result.includes("Error")) {
        const summary = output.result.slice(0, 200)
        if (summary.length > 20) {
          storeMemory(`bash: ${summary}`, "procedural")
        }
      }
    },

    event: async ({ event }: { event: { type: string; properties?: unknown } }): Promise<void> => {
      const props = event.properties as Record<string, unknown> | undefined
      
      // Capture errors
      if (event.type === "error") {
        const message = props?.message as string
        if (message) {
          storeMemory(`Error encountered: ${message}`, "emotional")
          const sessionID = props?.sessionID as string
          const session = sessionData.get(sessionID)
          if (session) session.errors++
        }
      }
      
      // Session end - store summary
      if (event.type === "session.end") {
        const sessionID = props?.sessionID as string
        const session = sessionData.get(sessionID)
        if (session && session.toolCalls.length > 0) {
          const uniqueTools = [...new Set(session.toolCalls)]
          const summary = `Session used ${uniqueTools.length} tools: ${uniqueTools.slice(0, 5).join(", ")}`
          storeMemory(summary, "episodic")
          sessionData.delete(sessionID)
        }
      }
    },
  }
}