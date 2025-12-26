import { execSync } from "child_process"

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

// Collections with specific purposes
type MemoryCollection = "rules" | "tools" | "workflows" | "errors"

interface ToolMetrics {
  calls: number
  successes: number
  failures: number
}

// In-memory tracking (not persisted, just for session analysis)
const sessionMetrics = new Map<string, {
  tools: Map<string, ToolMetrics>
  skills: Set<string>
  agents: Map<string, number>
  filesModified: Set<string>
}>()

function getSession(sessionID: string) {
  if (!sessionMetrics.has(sessionID)) {
    sessionMetrics.set(sessionID, {
      tools: new Map(),
      skills: new Set(),
      agents: new Map(),
      filesModified: new Set()
    })
  }
  return sessionMetrics.get(sessionID)!
}

function storeMemory(content: string, collection: MemoryCollection): void {
  if (!content || content.length < 10 || content.length > 300) return
  try {
    const sanitized = content.replace(/"/g, '\\"').replace(/\n/g, ' ').trim()
    execSync(
      `bun ${MEMORY_CLI_PATH} add "${sanitized}" --collection=${collection}`,
      { encoding: "utf-8", timeout: 5000, stdio: "pipe" }
    )
  } catch {
    // Silent fail
  }
}

function showNotification(title: string, message: string): void {
  if (process.platform !== "linux") return
  try {
    const sanitized = message.replace(/"/g, '\\"').slice(0, 100)
    execSync(`notify-send "${title}" "${sanitized}"`, { timeout: 1000, stdio: "pipe" })
  } catch {}
}

// Extract RULES from user messages (explicit instructions)
function extractRule(content: string): string | null {
  // Must contain explicit rule indicators
  const rulePatterns = [
    /\b(always|never|don'?t ever|must|should always)\s+(.{10,80})/i,
    /\b(rule|remember|from now on)[:\s]+(.{10,80})/i,
    /\b(use|prefer)\s+(\w+)\s+(instead of|not|over)\s+(\w+)/i,
  ]

  for (const pattern of rulePatterns) {
    const match = content.match(pattern)
    if (match) {
      // Return just the rule, not the full message
      return match[0].slice(0, 150)
    }
  }
  return null
}

export function createMemoryCaptureHook() {
  return {
    "chat.message": async (
      _input: { sessionID: string },
      output: {
        message: Record<string, unknown>
        parts: Array<{ type: string; text?: string }>
      }
    ): Promise<void> => {
      const role = (output.message as any)?.role
      if (role !== "user") return // Only capture from user messages

      const content = output.parts
        .filter(p => p.type === "text" && p.text)
        .map(p => p.text!)
        .join(" ")

      if (!content || content.length < 20) return

      // Skip continuation prompts and system injections
      if (content.includes("Continuation Prompt") ||
          content.includes("<recalled_memories>") ||
          content.includes("[COMPACTION") ||
          content.includes("[SYSTEM")) return

      // Extract explicit rules only
      const rule = extractRule(content)
      if (rule) {
        storeMemory(`RULE: ${rule}`, "rules")
        showNotification("Rule Captured", rule)
      }
    },

    "tool.execute.after": async (
      input: {
        sessionID: string
        tool: string
        args?: Record<string, unknown>
      },
      output: {
        output: string
        metadata?: unknown
      }
    ): Promise<void> => {
      const session = getSession(input.sessionID)
      const toolName = input.tool

      // Track tool usage
      if (!session.tools.has(toolName)) {
        session.tools.set(toolName, { calls: 0, successes: 0, failures: 0 })
      }
      const metrics = session.tools.get(toolName)!
      metrics.calls++

      const isError = output.output?.includes("Error") ||
                      output.output?.includes("error:") ||
                      output.output?.includes("failed")

      if (isError) {
        metrics.failures++

        // Only store meaningful, actionable errors (not stack traces)
        if (output.output.length < 200) {
          const errorSummary = `${toolName} error: ${output.output.slice(0, 100)}`
          storeMemory(errorSummary, "errors")
        }
      } else {
        metrics.successes++
      }

      // Track skill loads
      if (toolName === "skill") {
        const skillName = (input.args as any)?.name
        if (skillName) {
          session.skills.add(skillName)
        }
      }

      // Track agent spawns
      if (toolName === "background_task" || toolName === "call_omo_agent") {
        const agent = (input.args as any)?.agent || (input.args as any)?.subagent_type
        if (agent) {
          session.agents.set(agent, (session.agents.get(agent) || 0) + 1)
        }
      }

      // Track file modifications
      if (toolName === "edit" || toolName === "write") {
        const filePath = (input.args as any)?.filePath
        if (filePath) {
          session.filesModified.add(filePath)
        }
      }
    },

    event: async ({ event }: { event: { type: string; properties?: unknown } }): Promise<void> => {
      const props = event.properties as Record<string, unknown> | undefined

      // On session end, store workflow summary (compact format)
      if (event.type === "session.end") {
        const sessionID = props?.sessionID as string
        const session = sessionMetrics.get(sessionID)

        if (session && session.tools.size > 0) {
          // Create compact workflow summary
          const topTools = [...session.tools.entries()]
            .sort((a, b) => b[1].calls - a[1].calls)
            .slice(0, 5)
            .map(([name, m]) => `${name}:${m.calls}`)
            .join(",")

          const skills = [...session.skills].join(",") || "none"
          const agents = [...session.agents.keys()].join(",") || "none"
          const files = session.filesModified.size

          // Compact format: "tools:X|skills:Y|agents:Z|files:N"
          const summary = `tools:${topTools}|skills:${skills}|agents:${agents}|files:${files}`
          storeMemory(summary, "workflows")

          sessionMetrics.delete(sessionID)
        }
      }
    },
  }
}
