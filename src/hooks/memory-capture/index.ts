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
]

function storeMemory(content: string, collection = "semantic"): void {
  try {
    execSync(
      `bun ${MEMORY_CLI_PATH} add "${content.replace(/"/g, '\\"').slice(0, 500)}" --collection=${collection}`,
      { encoding: "utf-8", timeout: 10000, stdio: "pipe" }
    )
  } catch {
    // Silently fail - don't interrupt user flow
  }
}

function isPreferenceMessage(content: string): boolean {
  return PREFERENCE_PATTERNS.some((p) => p.test(content))
}

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
      if (isPreferenceMessage(content)) {
        storeMemory(content, "semantic")
      }
    },

    event: async ({ event }: { event: { type: string; properties?: unknown } }): Promise<void> => {
      if (event.type === "message.updated") {
        const props = event.properties as Record<string, unknown> | undefined
        const info = props?.info as Record<string, unknown> | undefined
        const role = info?.role as string | undefined

        if (role === "assistant") {
          // Could capture important assistant learnings here
          // For now, just pass
        }
      }
    },
  }
}