import { describe, test, expect } from "bun:test"

import { createTodoTicketBridgeHook } from "./index"
import { SUGGESTION_MESSAGE } from "./constants"

type HookInput = { tool: string; sessionID: string; callID: string }
type HookAfterOutput = {
  title: string
  output: string
  metadata: unknown
  args: Record<string, unknown>
}

const DEFAULT_INPUT: HookInput = {
  tool: "todowrite",
  sessionID: "ses_todo_ticket_bridge",
  callID: "call_todo_ticket_bridge",
}

async function runHook(args: {
  enforcement: "off" | "warn" | "block"
  todos: unknown
  tool?: string
  output?: string
}): Promise<HookAfterOutput> {
  const hook = createTodoTicketBridgeHook({ enforcement: args.enforcement }) as {
    "tool.execute.after"?: (
      input: HookInput,
      output: HookAfterOutput
    ) => Promise<void> | void
  }
  const output: HookAfterOutput = {
    title: "todowrite",
    output: args.output ?? "",
    metadata: null,
    args: { todos: args.todos },
  }

  await hook["tool.execute.after"]?.(
    { ...DEFAULT_INPUT, tool: args.tool ?? DEFAULT_INPUT.tool },
    output
  )

  return output
}

describe("createTodoTicketBridgeHook", () => {
  describe("#given enforcement warn", () => {
    test("#when todowrite with 3 todos #then suggests tickets", async () => {
      const result = await runHook({
        enforcement: "warn",
        todos: [
          { content: "one", status: "pending", priority: "high" },
          { content: "two", status: "pending", priority: "high" },
          { content: "three", status: "pending", priority: "high" },
        ],
      })

      expect(result.output).toContain(SUGGESTION_MESSAGE(3))
    })

    test("#when todowrite with 1 todo #then no suggestion (below threshold)", async () => {
      const result = await runHook({
        enforcement: "warn",
        todos: [{ content: "one", status: "pending", priority: "high" }],
      })

      expect(result.output).toBe("")
    })

    test("#when non-todowrite tool #then no suggestion", async () => {
      const result = await runHook({
        enforcement: "warn",
        tool: "bash",
        todos: [
          { content: "one", status: "pending", priority: "high" },
          { content: "two", status: "pending", priority: "high" },
        ],
      })

      expect(result.output).toBe("")
    })

    test("#when todowrite with non-array todos arg #then no suggestion", async () => {
      const result = await runHook({
        enforcement: "warn",
        todos: { content: "one", status: "pending", priority: "high" },
      })

      expect(result.output).toBe("")
    })
  })

  describe("#given enforcement off", () => {
    test("#when todowrite with 5 todos #then no suggestion", async () => {
      const result = await runHook({
        enforcement: "off",
        todos: [1, 2, 3, 4, 5],
      })

      expect(result.output).toBe("")
    })
  })
})
