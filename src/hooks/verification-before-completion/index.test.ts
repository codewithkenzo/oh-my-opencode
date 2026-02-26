import { describe, test, expect } from "bun:test"

import { WARN_MESSAGE } from "./constants"
import { createVerificationBeforeCompletionHook } from "./hook"

type HookInput = { tool: string; sessionID: string; callID: string }
type HookOutput = {
  title: string
  output: string
  metadata: unknown
  args: Record<string, unknown>
}

const DEFAULT_INPUT: HookInput = {
  tool: "bash",
  sessionID: "ses_verification_before_completion",
  callID: "call_verification_before_completion",
}

async function runHook(args: {
  enforcement: "off" | "warn" | "block"
  command: string
  tool?: string
  sessionID?: string
}): Promise<{ hook: ReturnType<typeof createVerificationBeforeCompletionHook>; output: HookOutput }> {
  const hook = createVerificationBeforeCompletionHook({ enforcement: args.enforcement })
  const output: HookOutput = {
    title: "bash",
    output: "",
    metadata: {},
    args: { command: args.command },
  }

  await hook["tool.execute.after"]?.(
    {
      ...DEFAULT_INPUT,
      tool: args.tool ?? DEFAULT_INPUT.tool,
      sessionID: args.sessionID ?? DEFAULT_INPUT.sessionID,
    },
    output
  )

  return { hook, output }
}

describe("createVerificationBeforeCompletionHook", () => {
  describe("#given enforcement warn", () => {
    test("#when bash with bun test #then marks tests as run", async () => {
      const { hook } = await runHook({ enforcement: "warn", command: "bun test" })

      expect(hook.getVerificationState(DEFAULT_INPUT.sessionID)).toEqual({
        testsRun: true,
        typecheckRun: false,
      })
    })

    test("#when bash with bun run typecheck #then marks typecheck as run", async () => {
      const { hook } = await runHook({ enforcement: "warn", command: "bun run typecheck" })

      expect(hook.getVerificationState(DEFAULT_INPUT.sessionID)).toEqual({
        testsRun: false,
        typecheckRun: true,
      })
    })

    test("#when no verification commands run #then getReminder returns warning", async () => {
      const { hook } = await runHook({ enforcement: "warn", command: "ls -la" })

      expect(hook.getReminder(DEFAULT_INPUT.sessionID)).toBe(
        WARN_MESSAGE(["tests", "typecheck"])
      )
    })

    test("#when both verifications run #then getReminder returns null", async () => {
      const hook = createVerificationBeforeCompletionHook({ enforcement: "warn" })
      const testOutput: HookOutput = {
        title: "bash",
        args: { command: "bun test" },
        output: "",
        metadata: {},
      }
      const typecheckOutput: HookOutput = {
        title: "bash",
        args: { command: "bun run typecheck" },
        output: "",
        metadata: {},
      }

      await hook["tool.execute.after"]?.(DEFAULT_INPUT, testOutput)
      await hook["tool.execute.after"]?.(DEFAULT_INPUT, typecheckOutput)

      expect(hook.getReminder(DEFAULT_INPUT.sessionID)).toBeNull()
    })
  })

  describe("#given enforcement off", () => {
    test("#when no verifications #then getReminder returns null", async () => {
      const { hook } = await runHook({ enforcement: "off", command: "ls -la" })

      expect(hook.getReminder(DEFAULT_INPUT.sessionID)).toBeNull()
    })
  })

  describe("#given any enforcement", () => {
    test("#when non-bash tool #then no state change", async () => {
      const { hook } = await runHook({
        enforcement: "warn",
        command: "bun test",
        tool: "read",
      })

      expect(hook.getVerificationState(DEFAULT_INPUT.sessionID)).toEqual({
        testsRun: false,
        typecheckRun: false,
      })
    })
  })
})
