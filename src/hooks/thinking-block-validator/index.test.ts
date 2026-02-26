import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"

import { createThinkingBlockValidatorHook } from "./index"

type MessageWithParts = {
  info: {
    role: string
    modelID?: string
    id?: string
    sessionID?: string
  }
  parts: Array<{ type: string; text?: string; thinking?: string; id?: string }>
}

async function runTransform(
  hook: ReturnType<typeof createThinkingBlockValidatorHook>,
  output: { messages: MessageWithParts[] }
): Promise<void> {
  const transform = hook["experimental.chat.messages.transform"] as unknown as
    | ((input: Record<string, never>, out: { messages: MessageWithParts[] }) => Promise<void>)
    | undefined

  await transform?.({}, output)
}

describe("createThinkingBlockValidatorHook", () => {
  let nowSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    nowSpy = spyOn(Date, "now").mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    nowSpy.mockRestore()
  })

  test("#when assistant message has tool content without leading thinking #then prepends previous thinking block", async () => {
    // #given
    const hook = createThinkingBlockValidatorHook()
    const messages: MessageWithParts[] = [
      {
        info: { role: "assistant", id: "msg_prev", sessionID: "ses_1" },
        parts: [{ type: "reasoning", text: "Plan the approach first" }],
      },
      {
        info: { role: "user", modelID: "anthropic/claude-sonnet-4-5" },
        parts: [{ type: "text", text: "continue" }],
      },
      {
        info: { role: "assistant", id: "msg_target", sessionID: "ses_1" },
        parts: [{ type: "tool_use", id: "tool_1" }],
      },
    ]
    const output = { messages }

    // #when
    await runTransform(hook, output)

    // #then
    expect(output.messages[2].parts[0].type).toBe("reasoning")
    expect(output.messages[2].parts[0].text).toBe("Plan the approach first")
    expect(output.messages[2].parts[1].type).toBe("tool_use")
  })

  test("#when model is not thinking-capable #then leaves assistant parts unchanged", async () => {
    // #given
    const hook = createThinkingBlockValidatorHook()
    const messages: MessageWithParts[] = [
      {
        info: { role: "user", modelID: "openai/gpt-4o" },
        parts: [{ type: "text", text: "continue" }],
      },
      {
        info: { role: "assistant", id: "msg_target", sessionID: "ses_2" },
        parts: [{ type: "tool_use", id: "tool_2" }],
      },
    ]
    const output = { messages }

    // #when
    await runTransform(hook, output)

    // #then
    expect(output.messages[1].parts).toEqual([{ type: "tool_use", id: "tool_2" }])
  })

  test("#when no previous thinking exists #then prepends placeholder reasoning", async () => {
    // #given
    const hook = createThinkingBlockValidatorHook()
    const messages: MessageWithParts[] = [
      {
        info: { role: "user", modelID: "anthropic/claude-3-7-sonnet" },
        parts: [{ type: "text", text: "continue" }],
      },
      {
        info: { role: "assistant", id: "msg_target", sessionID: "ses_3" },
        parts: [{ type: "text", text: "Done" }],
      },
    ]
    const output = { messages }

    // #when
    await runTransform(hook, output)

    // #then
    expect(output.messages[1].parts[0].type).toBe("reasoning")
    expect(output.messages[1].parts[0].text).toBe("[Continuing from previous reasoning]")
  })

  test("#when assistant message already starts with thinking #then does not prepend duplicate block", async () => {
    // #given
    const hook = createThinkingBlockValidatorHook()
    const messages: MessageWithParts[] = [
      {
        info: { role: "user", modelID: "anthropic/claude-opus-4-5" },
        parts: [{ type: "text", text: "continue" }],
      },
      {
        info: { role: "assistant", id: "msg_target", sessionID: "ses_4" },
        parts: [
          { type: "thinking", thinking: "I should reason first" },
          { type: "tool_use", id: "tool_3" },
        ],
      },
    ]
    const output = { messages }

    // #when
    await runTransform(hook, output)

    // #then
    expect(output.messages[1].parts).toHaveLength(2)
    expect(output.messages[1].parts[0].type).toBe("thinking")
  })
})
