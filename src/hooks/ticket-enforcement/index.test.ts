import { describe, expect, test } from "bun:test"

import { BLOCK_MESSAGE, WARN_MESSAGE } from "./constants"
import { createTicketEnforcementHook } from "./index"

type HookInput = { tool: string; sessionID: string; callID: string }
type BeforeOutput = { args: Record<string, unknown>; output?: string }
type AfterOutput = { title: string; output: string; metadata: unknown }

const DEFAULT_INPUT: HookInput = {
  tool: "write",
  sessionID: "ses_ticket_enforcement",
  callID: "call_ticket_enforcement",
}

async function runBefore(args: {
  enforcement: "off" | "warn" | "block"
  tool: string
  sessionID?: string
  initialOutput?: string
  markActive?: boolean
}): Promise<{ output: BeforeOutput; error: unknown | null }> {
  const hook = createTicketEnforcementHook({ enforcement: args.enforcement })
  const output: BeforeOutput = { args: {}, output: args.initialOutput ?? "" }
  const sessionID = args.sessionID ?? DEFAULT_INPUT.sessionID

  if (args.markActive) {
    hook.markTicketActive(sessionID)
  }

  try {
    await hook["tool.execute.before"]?.(
      { ...DEFAULT_INPUT, tool: args.tool, sessionID },
      output
    )
    return { output, error: null }
  } catch (error) {
    return { output, error }
  }
}

describe("createTicketEnforcementHook", () => {
  describe("#given enforcement warn", () => {
    test("#when Write tool with no active ticket #then warns", async () => {
      const result = await runBefore({ enforcement: "warn", tool: "write" })

      expect(result.error).toBeNull()
      expect(result.output.output).toContain(WARN_MESSAGE)
    })

    test("#when Write tool with active ticket #then passes", async () => {
      const result = await runBefore({
        enforcement: "warn",
        tool: "write",
        markActive: true,
      })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })

    test("#when ticket_start succeeds #then marks session active", async () => {
      const hook = createTicketEnforcementHook({ enforcement: "warn" })
      const sessionID = "ses_ticket_after_start"
      const afterOutput: AfterOutput = { title: "ticket_start", output: "ok", metadata: {} }
      const beforeOutput: BeforeOutput = { args: {}, output: "" }

      await hook["tool.execute.after"]?.(
        { ...DEFAULT_INPUT, tool: "ticket_start", sessionID },
        afterOutput
      )
      await hook["tool.execute.before"]?.(
        { ...DEFAULT_INPUT, tool: "write", sessionID },
        beforeOutput
      )

      expect(beforeOutput.output).toBe("")
    })
  })

  describe("#given enforcement block", () => {
    test("#when Edit tool with no active ticket #then blocks", async () => {
      const result = await runBefore({ enforcement: "block", tool: "edit" })

      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe(BLOCK_MESSAGE)
    })
  })

  describe("#given enforcement off", () => {
    test("#when Write tool with no active ticket #then no interception", async () => {
      const result = await runBefore({ enforcement: "off", tool: "write" })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })
  })

  describe("#given any enforcement", () => {
    test("#when Read tool #then always passes", async () => {
      const result = await runBefore({ enforcement: "block", tool: "read" })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })

    test("#when ticket_start tool #then not enforced", async () => {
      const result = await runBefore({ enforcement: "block", tool: "ticket_start" })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })
  })
})
