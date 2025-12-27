import { execSync } from "child_process"
import type { PluginInput } from "@opencode-ai/plugin"
import { showToast } from "../../shared"

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

interface Memory {
  content: string
  collection: string
}

function queryMemories(query: string, limit: number = 3): Memory[] {
  if (!query || query.length < 15) return []
  try {
    const sanitized = query.replace(/"/g, '\\"').slice(0, 150)
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
  const context = memories.filter(m => m.collection === "context")
  const other = memories.filter(m => !["rules", "workflows", "errors", "context"].includes(m.collection))
  
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
  if (context.length > 0) {
    lines.push(`[CONTEXT] ${context.map(c => c.content.slice(0, 100)).join(" | ")}`)
  }
  if (other.length > 0) {
    lines.push(`[MEMORY] ${other.map(o => o.content.slice(0, 80)).join(" | ")}`)
  }
  
  return lines.join("\n")
}

function buildQueryContext(prompt: string, workingDir: string): string {
  const contextParts: string[] = [prompt.slice(0, 100)]
  if (workingDir) {
    contextParts.push(`wd:${workingDir.split("/").pop()}`)
  }
  return contextParts.join(" ")
}

export function createMemoryInjectorHook(input: PluginInput) {
  const injectedSessions = new Set<string>()
  const recentTools = new Map<string, number>()
  const recentSkills = new Set<string>()

  return {
    "prompt.submit": async (
      _input: { sessionID: string },
      output: { parts: Array<{ type: string; text?: string }> }
    ) => {
      if (injectedSessions.has(_input.sessionID)) return

      const promptText = output.parts
        .filter(p => p.type === "text" && p.text)
        .map(p => p.text!)
        .join(" ")

      if (!promptText || promptText.length < 20) return

      if (promptText.includes("[COMPACTION") || promptText.includes("[SYSTEM")) return

      // Build better query context from working directory and recent usage
      const queryContext = buildQueryContext(promptText, input.directory || process.cwd())
      const memories = queryMemories(queryContext, 5)
      if (memories.length === 0) return
      
      injectedSessions.add(_input.sessionID)

      const compact = formatCompact(memories)
      if (!compact) return

      output.parts.unshift({
        type: "text",
        text: `<memory>${compact}</memory>`
      })

      showToast(input, { title: "Memories Recalled", message: `${memories.length} memories recalled`, variant: "info" })

      return {
        notifications: [{
          type: "info" as const,
          message: `Recalled ${memories.length} memories`
        }]
      }
    },

    onSummarize: async (
      _input: { sessionID: string },
      output: { contextToPreserve: Array<{ role: string; content: string }> }
    ) => {
      // Inject memories into compaction context to preserve them
      const queryContext = buildQueryContext("compaction", input.directory || process.cwd())
      const memories = queryMemories(queryContext, 3)
      if (memories.length === 0) return

      const compact = formatCompact(memories)
      if (!compact) return

        output.contextToPreserve.push({
          role: "system",
          content: `<memory>${compact}</memory>`
        })

        showToast(input, { title: "Memories Preserved", message: `${memories.length} memories preserved`, variant: "info" })
      },

    event: async ({ event }: { event: { type: string; properties?: unknown } }) => {
      const props = event.properties as Record<string, unknown> | undefined

      // Clear injected flag on compaction so memories re-inject
      if (event.type === "session.compacted") {
        const sessionID = (props?.sessionID ?? (props?.info as { id?: string } | undefined)?.id) as string | undefined
        if (sessionID) {
          injectedSessions.delete(sessionID)
          showToast(input, { title: "Memory Ready", message: "Memories re-injected after compaction", variant: "info" })
        }
      }

      // Clear injected flag on session end/delete
      if (event.type === "session.deleted" || event.type === "session.end") {
        const sessionID = (props?.sessionID ?? (props?.info as { id?: string } | undefined)?.id) as string | undefined
        if (sessionID) injectedSessions.delete(sessionID)
      }
    }
  }
}
