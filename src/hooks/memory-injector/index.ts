import { execSync } from "child_process"

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

interface Memory {
  content: string
  collection: string
}

function queryMemories(prompt: string, limit: number = 3): Memory[] {
  if (!prompt || prompt.length < 15) return []
  try {
    const sanitized = prompt.replace(/"/g, '\\"').slice(0, 150)
    const result = execSync(
      `bun ${MEMORY_CLI_PATH} query "${sanitized}" --limit=${limit}`,
      { encoding: "utf-8", timeout: 5000, stdio: "pipe" }
    )
    const data = JSON.parse(result)
    if (data.error || !data.memories) return []
    return data.memories.map((m: any) => ({
      content: m.content,
      collection: m.collection || "default"
    }))
  } catch {
    return []
  }
}

function formatCompact(memories: Memory[]): string {
  const rules = memories.filter(m => m.collection === "rules")
  const workflows = memories.filter(m => m.collection === "workflows")
  const errors = memories.filter(m => m.collection === "errors")
  const other = memories.filter(m => !["rules", "workflows", "errors"].includes(m.collection))
  
  const lines: string[] = []
  
  if (rules.length > 0) {
    lines.push(`[RULES] ${rules.map(r => r.content.replace("RULE: ", "")).join(" | ")}`)
  }
  if (errors.length > 0) {
    lines.push(`[ERRORS] ${errors.map(e => e.content).join(" | ")}`)
  }
  if (workflows.length > 0) {
    lines.push(`[WORKFLOWS] ${workflows.map(w => w.content).join(" | ")}`)
  }
  if (other.length > 0) {
    lines.push(`[CONTEXT] ${other.map(o => o.content.slice(0, 80)).join(" | ")}`)
  }
  
  return lines.join("\n")
}

export function createMemoryInjectorHook() {
  const injectedSessions = new Set<string>()

  return {
    "prompt.submit": async (
      input: { sessionID: string },
      output: { parts: Array<{ type: string; text?: string }> }
    ) => {
      if (injectedSessions.has(input.sessionID)) return

      const promptText = output.parts
        .filter(p => p.type === "text" && p.text)
        .map(p => p.text!)
        .join(" ")

      if (!promptText || promptText.length < 20) return

      if (promptText.includes("[COMPACTION") || promptText.includes("[SYSTEM")) return

      const memories = queryMemories(promptText, 5)
      if (memories.length === 0) return
      
      injectedSessions.add(input.sessionID)

      const compact = formatCompact(memories)
      if (!compact) return

      output.parts.unshift({
        type: "text",
        text: `<memory>${compact}</memory>`
      })

      return {
        notifications: [{
          type: "info" as const,
          message: `Recalled ${memories.length} memories`
        }]
      }
    },

    event: async ({ event }: { event: { type: string; properties?: unknown } }) => {
      if (event.type === "session.deleted" || event.type === "session.end") {
        const props = event.properties as Record<string, unknown> | undefined
        const sessionID = props?.sessionID as string
        if (sessionID) injectedSessions.delete(sessionID)
      }
    }
  }
}
