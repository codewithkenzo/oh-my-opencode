import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"

import { createContextWindowMonitorHook } from "./index"

type SessionMessagesResponse = {
  data: Array<{
    info: {
      role: string
      providerID?: string
      tokens?: {
        input: number
        output: number
        reasoning: number
        cache: { read: number; write: number }
      }
    }
  }>
}

function createCtx(response: SessionMessagesResponse) {
  return {
    directory: "/repo",
    client: {
      session: {
        messages: async () => response,
      },
    },
  } as const
}

describe("createContextWindowMonitorHook", () => {
  let messagesSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    messagesSpy = spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    messagesSpy.mockRestore()
  })

  test("#when anthropic usage crosses threshold #then appends context reminder once", async () => {
    // #given
    const response: SessionMessagesResponse = {
      data: [
        {
          info: {
            role: "assistant",
            providerID: "anthropic",
            tokens: {
              input: 130_000,
              output: 0,
              reasoning: 0,
              cache: { read: 10_000, write: 0 },
            },
          },
        },
      ],
    }
    const ctx = createCtx(response)
    const sessionMessagesSpy = spyOn(ctx.client.session, "messages")
    const hook = createContextWindowMonitorHook(ctx as never)
    const output = { title: "read", output: "result", metadata: {} }

    // #when
    await hook["tool.execute.after"]?.(
      { tool: "read", sessionID: "ses_ctx_1", callID: "call_1" },
      output
    )
    await hook["tool.execute.after"]?.(
      { tool: "read", sessionID: "ses_ctx_1", callID: "call_2" },
      output
    )

    // #then
    expect(output.output).toContain("You are using Anthropic Claude with 1M context window.")
    expect(output.output).toContain("Context Status: 14.0% used (140,000/1,000,000 tokens), 86.0% remaining")
    expect(sessionMessagesSpy).toHaveBeenCalledTimes(1)
    sessionMessagesSpy.mockRestore()
  })

  test("#when latest assistant provider is non-anthropic #then does not append reminder", async () => {
    // #given
    const response: SessionMessagesResponse = {
      data: [
        {
          info: {
            role: "assistant",
            providerID: "openai",
            tokens: {
              input: 190_000,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
          },
        },
      ],
    }
    const hook = createContextWindowMonitorHook(createCtx(response) as never)
    const output = { title: "read", output: "result", metadata: {} }

    // #when
    await hook["tool.execute.after"]?.(
      { tool: "read", sessionID: "ses_ctx_2", callID: "call_1" },
      output
    )

    // #then
    expect(output.output).toBe("result")
  })

  test("#when usage is below threshold #then does not append reminder", async () => {
    // #given
    const response: SessionMessagesResponse = {
      data: [
        {
          info: {
            role: "assistant",
            providerID: "anthropic",
            tokens: {
              input: 100_000,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
          },
        },
      ],
    }
    const hook = createContextWindowMonitorHook(createCtx(response) as never)
    const output = { title: "read", output: "result", metadata: {} }

    // #when
    await hook["tool.execute.after"]?.(
      { tool: "read", sessionID: "ses_ctx_3", callID: "call_1" },
      output
    )

    // #then
    expect(output.output).toBe("result")
  })

  test("#when session is deleted #then reminder state is cleared for that session", async () => {
    // #given
    const response: SessionMessagesResponse = {
      data: [
        {
          info: {
            role: "assistant",
            providerID: "anthropic",
            tokens: {
              input: 130_000,
              output: 0,
              reasoning: 0,
              cache: { read: 10_000, write: 0 },
            },
          },
        },
      ],
    }
    const ctx = createCtx(response)
    const sessionMessagesSpy = spyOn(ctx.client.session, "messages")
    const hook = createContextWindowMonitorHook(ctx as never)
    const output = { title: "read", output: "result", metadata: {} }

    // #when
    await hook["tool.execute.after"]?.(
      { tool: "read", sessionID: "ses_ctx_4", callID: "call_1" },
      output
    )
    await hook.event?.({ event: { type: "session.deleted", properties: { info: { id: "ses_ctx_4" } } } })
    await hook["tool.execute.after"]?.(
      { tool: "read", sessionID: "ses_ctx_4", callID: "call_2" },
      output
    )

    // #then
    expect(sessionMessagesSpy).toHaveBeenCalledTimes(2)
    sessionMessagesSpy.mockRestore()
  })
})
