import { extractPromptText } from "../keyword-detector/detector"
import { execSync } from "child_process"

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

// More specific patterns for user preferences (avoiding "i want" which is too broad)
const PREFERENCE_PATTERNS = [
  /\b(i prefer|my preference is|i'd rather)\b/i,
  /\b(always|never) use\b/i,
  /\b(don't|do not) ever\b/i,
  /\b(make sure to|remember that|from now on)\b/i,
  /\bi (love|hate|can't stand)\b/i,
]

// Patterns for technical decisions and project-specific facts
const TECHNICAL_DECISION_PATTERNS = [
  /\b(decided to|chose to|going with)\b.*\b(architecture|approach|pattern)\b/i,
  /\b(using|adopting) (bun|bun only)\b/i,
  /\b(standard|convention) for (this project|our codebase)\b/i,
  /\b(project|repo) (uses|requires)\b/i,
]

// Patterns for solved problems and solutions
const SOLVED_PROBLEM_PATTERNS = [
  /\b(fixed|solved|resolved) (the|this) (issue|problem|bug)\b/i,
  /\b(workaround|solution for)\b/i,
  /\b(found the (?:cause|root cause))\b/i,
  /\b(debugged and fixed)\b/i,
]

// Procedural knowledge patterns
const PROCEDURAL_PATTERNS = [
  /\b(how to|the way to|best way to)\b/i,
  /\byou can (do|achieve)\b.*\b(by|via|using)\b/i,
  /\brun (this|the) command\b/i,
  /\bstep-by-step\b/i,
]

type MemoryCollection = "semantic" | "episodic" | "procedural" | "emotional" | "reflective"

function showNotification(title: string, message: string): void {
  if (process.platform !== "linux") return

  try {
    const sanitizedMessage = message.replace(/"/g, '\\"').slice(0, 200)
    execSync(
      `notify-send "${title}" "${sanitizedMessage}"`,
      { encoding: "utf-8", timeout: 1000, stdio: "pipe" }
    )
  } catch {
  }
}

function storeMemory(content: string, collection: MemoryCollection = "semantic"): void {
  if (!content || content.length < 10) return
  try {
    const sanitized = content.replace(/"/g, '\\"').replace(/\n/g, ' ').slice(0, 500)
    execSync(
      `bun ${MEMORY_CLI_PATH} add "${sanitized}" --collection=${collection}`,
      { encoding: "utf-8", timeout: 10000, stdio: "pipe" }
    )
    showNotification("Memory Captured", sanitized)
  } catch {
    // Silently fail - don't interrupt user flow
  }
}

function isPreferenceMessage(content: string): boolean {
  return PREFERENCE_PATTERNS.some((p) => p.test(content))
}

function isTechnicalDecision(content: string): boolean {
  return TECHNICAL_DECISION_PATTERNS.some((p) => p.test(content))
}

function isSolvedProblem(content: string): boolean {
  return SOLVED_PROBLEM_PATTERNS.some((p) => p.test(content))
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

      // Capture technical decisions from user
      if (role === "user" && isTechnicalDecision(content)) {
        storeMemory(content, "semantic")
      }

      // Capture solved problems from assistant
      if (role === "assistant" && isSolvedProblem(content)) {
        storeMemory(content, "semantic")
      }

      // Capture procedural knowledge from assistant
      if (role === "assistant" && isProceduralMessage(content)) {
        storeMemory(content, "procedural")
      }
    },

    "tool.execute.after": async (
      input: {
        sessionID: string
        tool: string
        callID: string
        args?: Record<string, unknown>
      },
      output: {
        title: string
        output: string
        metadata: unknown
      }
    ): Promise<void> => {
      const session = sessionData.get(input.sessionID)
      if (session) {
        session.toolCalls.push(input.tool)

        // Track file modifications from edit/write results
        if (["edit", "write"].includes(input.tool)) {
          try {
            const resultData = JSON.parse(output.output) as Record<string, unknown>
            const filePath = resultData.path as string | undefined
            if (filePath) {
              session.filesModified.add(filePath)
              storeMemory(`Modified: ${filePath}`, "semantic")
            }
          } catch {
          }
        }

        // Capture meaningful bash commands (non-trivial, successful)
        if (input.tool === "bash" && output.output) {
          const args = input.args as Record<string, unknown> | undefined
          const command = args?.command as string | undefined

          // Only capture non-trivial commands that succeeded
          if (
            command &&
            command.length > 10 &&
            !command.startsWith("ls ") &&
            !command.startsWith("cd ") &&
            !command.startsWith("echo ") &&
            !command.startsWith("cat ") &&
            !output.output.includes("Error") &&
            !output.output.includes("error")
          ) {
            const summary = output.output.slice(0, 100)
            if (summary.length > 20) {
              storeMemory(`bash: ${command.slice(0, 50)} → ${summary}`, "procedural")
            }
          }
        }
      }
    },

    event: async ({ event }: { event: { type: string; properties?: unknown } }): Promise<void> => {
      const props = event.properties as Record<string, unknown> | undefined

      // Capture errors
      if (event.type === "error") {
        const message = props?.message as string
        if (message && message.length < 300) { // Only capture error messages that aren't too long
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
          const fileCount = session.filesModified.size
          const summary = `Session: ${uniqueTools.length} tools used, ${fileCount} files modified, ${session.errors} errors`
          storeMemory(summary, "episodic")
          sessionData.delete(sessionID)
        }
      }
    },
  }
}
