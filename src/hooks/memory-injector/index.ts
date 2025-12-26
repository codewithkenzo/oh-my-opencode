import { execSync } from "child_process"

const MEMORY_CLI_PATH = `${process.env.HOME}/.config/opencode/lib/memory-cli.ts`

function queryMemories(prompt: string, limit: number = 3): string[] {
  if (!prompt || prompt.length < 10) return []
  try {
    const sanitized = prompt.replace(/"/g, '\\"').slice(0, 200)
    const result = execSync(
      `bun ${MEMORY_CLI_PATH} query "${sanitized}" --limit=${limit}`,
      { encoding: "utf-8", timeout: 10000, stdio: "pipe" }
    )
    const data = JSON.parse(result)
    if (data.error || !data.memories) return []
    return data.memories.map((m: any) => m.content)
  } catch {
    return []
  }
}

export function createMemoryInjectorHook() {
  const injectedPrompts = new Map<string, Set<string>>()

  return {
    "prompt.submit": async (
      input: { sessionID: string },
      output: { parts: Array<{ type: string; text?: string }> }
    ) => {
      const promptText = output.parts
        .filter(p => p.type === "text" && p.text)
        .map(p => p.text!)
        .join(" ")

      if (!promptText || promptText.length < 15) return

      const sessionPrompts = injectedPrompts.get(input.sessionID) ?? new Set()
      const promptKey = promptText.slice(0, 100)
      if (sessionPrompts.has(promptKey)) return
      sessionPrompts.add(promptKey)
      injectedPrompts.set(input.sessionID, sessionPrompts)

      const memories = queryMemories(promptText, 3)
      if (memories.length === 0) return

      const memoryContext = `<recalled_memories>
The following memories from previous sessions may be relevant:
${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}
</recalled_memories>`

      output.parts.unshift({
        type: "text",
        text: memoryContext
      })

      return {
        notifications: [{
          type: "info" as const,
          message: `Recalled ${memories.length} memories from previous sessions`
        }]
      }
    },

    event: async ({ event }: { event: { type: string; properties?: unknown } }) => {
      if (event.type === "session.deleted" || event.type === "session.end") {
        const props = event.properties as Record<string, unknown> | undefined
        const sessionID = props?.sessionID as string
        if (sessionID) injectedPrompts.delete(sessionID)
      }
    }
  }
}
