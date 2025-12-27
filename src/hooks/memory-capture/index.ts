import { execSync } from "child_process"
import type { PluginInput } from "@opencode-ai/plugin"

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

type MemoryCollection = "rules" | "tools" | "workflows" | "errors" | "context"

interface ToolMetrics {
  calls: number
  successes: number
  failures: number
}

const sessionMetrics = new Map<string, {
  tools: Map<string, ToolMetrics>
  skills: Set<string>
  agents: Map<string, number>
  filesModified: Set<string>
  workingDirectory: string | null
  projectContext: Set<string>
  toolSequence: Array<{ tool: string; timestamp: number }>
  decisionsCaptured: boolean
}>()

function getSession(sessionID: string) {
  if (!sessionMetrics.has(sessionID)) {
    sessionMetrics.set(sessionID, {
      tools: new Map(),
      skills: new Set(),
      agents: new Map(),
      filesModified: new Set(),
      workingDirectory: null,
      projectContext: new Set(),
      toolSequence: [],
      decisionsCaptured: false
    })
  }
  return sessionMetrics.get(sessionID)!
}

function showToast(ctx: PluginInput, title: string, message: string, variant: "info" | "warning" = "info"): void {
  try {
    ctx.client.tui.showToast?.({
      body: {
        title,
        message: message.slice(0, 200),
        variant,
        duration: 3000
      }
    })
  } catch {}
}

function storeMemory(content: string, collection: MemoryCollection, ctx?: PluginInput): void {
  if (!content || content.length < 10 || content.length > 300) return
  try {
    const sanitized = content.replace(/"/g, '\\"').replace(/\n/g, ' ').trim()
    execSync(
      `bun ${MEMORY_CLI_PATH} add "${sanitized}" --collection=${collection}`,
      { encoding: "utf-8", timeout: 5000, stdio: "pipe" }
    )
    if (ctx) {
      const msg = collection === "errors"
        ? `Stored error: ${sanitized.slice(0, 50)}`
        : `Stored ${collection}: ${sanitized.slice(0, 50)}`
      showToast(ctx, "Memory Stored", msg, "info")
    }
  } catch {}
}

function extractRule(content: string): string | null {
  const rulePatterns = [
    /\b(always|never|don'?t ever|must|should always)\s+(.{10,80})/i,
    /\b(rule|remember|from now on)[:\s]+(.{10,80})/i,
    /\b(use|prefer)\s+(\w+)\s+(instead of|not|over)\s+(\w+)/i,
  ]

  for (const pattern of rulePatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0].slice(0, 150)
    }
  }
  return null
}

export function createMemoryCaptureHook(input: PluginInput) {
  return {
    "chat.message": async (
      _input: any,
      output: any
    ): Promise<void> => {
      const sessionID = _input.sessionID as string
      const role = (output.message as any)?.role
      if (role !== "user") return

      const content = output.parts
        .filter((p: any) => p.type === "text" && p.text)
        .map((p: any) => p.text)
        .join(" ")

      if (!content || content.length < 20) return

      if (content.includes("Continuation Prompt") ||
          content.includes("<recalled_memories>") ||
          content.includes("[COMPACTION") ||
          content.includes("[SYSTEM")) return

      const rule = extractRule(content)
      if (rule) {
        storeMemory(`RULE: ${rule}`, "rules", input)
        showToast(input, "Rule Captured", rule.slice(0, 50))
      }
    },

    "tool.execute.after": async (
      _input: any,
      output: any
    ): Promise<void> => {
      const sessionID = _input.sessionID as string
      const toolName = _input.tool as string
      const session = getSession(sessionID)

      if (!session.tools.has(toolName)) {
        session.tools.set(toolName, { calls: 0, successes: 0, failures: 0 })
      }
      const metrics = session.tools.get(toolName)!
      metrics.calls++

      if (toolName === "read" || toolName === "glob") {
        const filePath = (_input.args as any)?.filePath || (_input.args as any)?.path
        if (filePath && session.filesModified.size === 0) {
          session.workingDirectory = (input as any).directory || process.cwd()
          const projectRoot = (input as any).project?.path
          if (projectRoot) {
            const context = `project:${projectRoot}|dir:${session.workingDirectory}`
            if (!session.projectContext.has(context)) {
              session.projectContext.add(context)
              storeMemory(`PROJECT: Working on ${projectRoot}`, "context")
            }
          }
        }
      }

      const isError = output.output?.includes("Error") ||
                      output.output?.includes("error:") ||
                      output.output?.includes("failed")

      if (isError) {
        metrics.failures++
        if (output.output.length < 200) {
          const errorContext = (_input.args as any)?.filePath
            ? `${toolName}(${(_input.args as any)?.filePath}): ${output.output.slice(0, 80)}`
            : `${toolName}: ${output.output.slice(0, 100)}`
          storeMemory(errorContext, "errors")
          showToast(input, "Error Stored", errorContext.slice(0, 50), "warning")
        }
      } else {
        metrics.successes++
      }

      if (metrics.successes > 0) {
        session.toolSequence.push({
          tool: toolName,
          timestamp: Date.now()
        })
      }

      if (session.toolSequence.length >= 3) {
        const lastThree = session.toolSequence.slice(-3).map(t => t.tool).join("->")
        if (!session.decisionsCaptured) {
          storeMemory(`PATTERN: Effective workflow: ${lastThree}`, "context")
          session.decisionsCaptured = true
        }
      }

      if (toolName === "skill") {
        const skillName = (_input.args as any)?.name
        if (skillName) {
          session.skills.add(skillName)
        }
      }

      if (toolName === "background_task" || toolName === "call_omo_agent") {
        const agent = (_input.args as any)?.agent || (_input.args as any)?.subagent_type
        if (agent) {
          session.agents.set(agent, (session.agents.get(agent) || 0) + 1)
        }
      }

      if (toolName === "edit" || toolName === "write") {
        const filePath = (_input.args as any)?.filePath
        if (filePath) {
          session.filesModified.add(filePath)
        }
      }
    },

    event: async (_event: any): Promise<void> => {
      const props = (_event as any).properties

      if ((_event as any).type === "session.idle") {
        const sessionID = props?.sessionID as string
        const session = sessionMetrics.get(sessionID)

        if (session && session.tools.size > 0) {
          const topTools = [...session.tools.entries()]
            .sort((a, b) => b[1].calls - a[1].calls)
            .slice(0, 5)
            .map(([name, m]) => `${name}:${m.calls}`)
            .join(",")

          const skills = [...session.skills].join(",") || "none"
          const agents = [...session.agents.keys()].join(",") || "none"
          const files = session.filesModified.size

          const summary = `tools:${topTools}|skills:${skills}|agents:${agents}|files:${files}`
          storeMemory(summary, "workflows", input)

          showToast(input, "Session Summary", `${session.tools.size} tools used`, "info")
          sessionMetrics.delete(sessionID)
        }
      }

      if ((_event as any).type === "session.end") {
        const sessionID = props?.sessionID as string
        const session = sessionMetrics.get(sessionID)

        if (session && session.tools.size > 0) {
          const topTools = [...session.tools.entries()]
            .sort((a, b) => b[1].calls - a[1].calls)
            .slice(0, 5)
            .map(([name, m]) => `${name}:${m.calls}`)
            .join(",")

          const skills = [...session.skills].join(",") || "none"
          const agents = [...session.agents.keys()].join(",") || "none"
          const files = session.filesModified.size

          const summary = `tools:${topTools}|skills:${skills}|agents:${agents}|files:${files}`
          storeMemory(summary, "workflows", input)

          sessionMetrics.delete(sessionID)
        }
      }
    },
  }
}
