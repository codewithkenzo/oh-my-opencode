import { describe, expect, test } from "bun:test"

import { SKILL_MANDATE } from "./constants"
import { createSkillAutoInvokeHook } from "./index"

type ChatInput = {
  sessionID: string
  agent?: string
}

type ChatOutput = {
  message: Record<string, unknown>
  parts: Array<{ type: string; text?: string }>
}

type ChatHook = {
  "chat.message"?: (input: ChatInput, output: ChatOutput) => Promise<void> | void
}

async function runChatMessage(args: {
  enforcement?: "off" | "warn"
  input: ChatInput
  output: ChatOutput
}): Promise<void> {
  const hook = createSkillAutoInvokeHook({ enforcement: args.enforcement }) as ChatHook
  await hook["chat.message"]?.(args.input, args.output)
}

describe("createSkillAutoInvokeHook", () => {
  test("#given enforcement warn #when first message in session #then injects skill mandate", async () => {
    const output: ChatOutput = {
      message: {},
      parts: [{ type: "text", text: "help me debug this" }],
    }

    await runChatMessage({
      enforcement: "warn",
      input: { sessionID: "session-1" },
      output,
    })

    expect(output.parts[0].text).toContain("help me debug this")
    expect(output.parts[0].text).toContain(SKILL_MANDATE)
  })

  test("#given enforcement warn #when second message in same session #then does not inject again", async () => {
    const hook = createSkillAutoInvokeHook({ enforcement: "warn" }) as ChatHook
    const firstOutput: ChatOutput = {
      message: {},
      parts: [{ type: "text", text: "first prompt" }],
    }
    const secondOutput: ChatOutput = {
      message: {},
      parts: [{ type: "text", text: "second prompt" }],
    }

    await hook["chat.message"]?.({ sessionID: "session-2" }, firstOutput)
    await hook["chat.message"]?.({ sessionID: "session-2" }, secondOutput)

    expect(firstOutput.parts[0].text).toContain(SKILL_MANDATE)
    expect(secondOutput.parts[0].text).toBe("second prompt")
  })

  test("#given enforcement off #when first message #then no injection", async () => {
    const output: ChatOutput = {
      message: {},
      parts: [{ type: "text", text: "help me" }],
    }

    await runChatMessage({
      enforcement: "off",
      input: { sessionID: "session-3" },
      output,
    })

    expect(output.parts[0].text).toBe("help me")
  })

  test("#given enforcement warn #when subagent session (input.agent set) #then no injection", async () => {
    const output: ChatOutput = {
      message: {},
      parts: [{ type: "text", text: "help me" }],
    }

    await runChatMessage({
      enforcement: "warn",
      input: { sessionID: "session-4", agent: "X1 - explorer" },
      output,
    })

    expect(output.parts[0].text).toBe("help me")
  })
})
