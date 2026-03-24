import { afterEach, beforeEach, describe, test, expect } from "bun:test"

import { createRmToTrashHook } from "./index"
import { BLOCK_MESSAGE, WARN_MESSAGE } from "./constants"

type HookInput = { tool: string; sessionID: string; callID: string }
type HookOutput = { args: Record<string, unknown>; output?: string }

const DEFAULT_INPUT: HookInput = {
  tool: "bash",
  sessionID: "ses_rm_to_trash",
  callID: "call_rm_to_trash",
}

const expectedTrashCommand = process.platform === "darwin" ? "trash" : "trash-put"

async function runHook(args: {
  enforcement: "off" | "warn" | "block"
  command: string
  tool?: string
}): Promise<{ output: HookOutput; error: unknown | null }> {
  const hook = createRmToTrashHook({ enforcement: args.enforcement })
  const output: HookOutput = { args: { command: args.command }, output: "" }

  try {
    await hook["tool.execute.before"]?.(
      { ...DEFAULT_INPUT, tool: args.tool ?? DEFAULT_INPUT.tool },
      output
    )
    return { output, error: null }
  } catch (error) {
    return { output, error }
  }
}

describe("createRmToTrashHook", () => {
  const originalCI = process.env.CI

  beforeEach(() => {
    process.env.CI = "false"
  })

  afterEach(() => {
    if (originalCI === undefined) {
      delete process.env.CI
      return
    }
    process.env.CI = originalCI
  })

  describe("#given enforcement warn", () => {
    test("#when rm file.txt #then warns and suggests trash alternative", async () => {
      const result = await runHook({ enforcement: "warn", command: "rm file.txt" })

      expect(result.error).toBeNull()
      expect(result.output.output).toContain(WARN_MESSAGE("rm file.txt", expectedTrashCommand))
    })

    test("#when rm -rf / #then blocks regardless of enforcement", async () => {
      const result = await runHook({ enforcement: "warn", command: "rm -rf /" })

      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe(BLOCK_MESSAGE("rm -rf /"))
    })

    test("#when rm -rf node_modules #then allows safe pattern", async () => {
      const result = await runHook({ enforcement: "warn", command: "rm -rf node_modules" })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })

    test("#when bun install containing internal rm #then does not intercept", async () => {
      const result = await runHook({
        enforcement: "warn",
        command: "bun install && rm -rf .tmp-bun-cache",
      })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })

    test("#when command has no rm #then does not intercept", async () => {
      const result = await runHook({ enforcement: "warn", command: "ls -la" })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })

    test("#when rm -r some-dir #then warns", async () => {
      const result = await runHook({ enforcement: "warn", command: "rm -r some-dir" })

      expect(result.error).toBeNull()
      expect(result.output.output).toContain(WARN_MESSAGE("rm -r some-dir", expectedTrashCommand))
    })
  })

  describe("#given enforcement block", () => {
    test("#when rm file.txt #then blocks with warning message", async () => {
      const result = await runHook({ enforcement: "block", command: "rm file.txt" })

      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe(
        WARN_MESSAGE("rm file.txt", expectedTrashCommand)
      )
    })

    test("#when rm -rf node_modules #then allows safe pattern", async () => {
      const result = await runHook({ enforcement: "block", command: "rm -rf node_modules" })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })
  })

  describe("#given enforcement off", () => {
    test("#when rm file.txt #then no interception", async () => {
      const result = await runHook({ enforcement: "off", command: "rm file.txt" })

      expect(result.error).toBeNull()
      expect(result.output.output).toBe("")
    })

    test("#when rm -rf / #then still blocks dangerous command", async () => {
      const result = await runHook({ enforcement: "off", command: "rm -rf /" })

      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error).message).toBe(BLOCK_MESSAGE("rm -rf /"))
    })
  })
})
