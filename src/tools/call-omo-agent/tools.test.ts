import { afterEach, describe, expect, it, spyOn } from "bun:test"
import { createCallOmoAgent } from "./tools"

describe("call_omo_agent tool", () => {
  const restores: Array<() => void> = []

  afterEach(() => {
    for (const restore of restores.splice(0)) restore()
  })

  it("#given unsupported subagent #when execute #then returns validation error", async () => {
    // #given
    const manager = {
      launch: async () => ({ id: "t1", sessionID: "s1", description: "d", agent: "X1 - explorer", status: "running" }),
    }
    const pluginCtx = { client: {} }
    const tool = createCallOmoAgent(pluginCtx as never, manager as never)

    // #when
    const output = await tool.execute({
      description: "quick check",
      prompt: "run",
      subagent_type: "D5 - backend builder" as never,
      run_in_background: true,
    }, { sessionID: "p1", messageID: "m1", agent: "Musashi", abort: new AbortController().signal } as never)

    // #then
    expect(output).toContain("Invalid agent type")
  })

  it("#given background mode with session_id #when execute #then rejects unsupported combination", async () => {
    // #given
    const manager = {
      launch: async () => ({ id: "t1", sessionID: "s1", description: "d", agent: "X1 - explorer", status: "running" }),
    }
    const pluginCtx = { client: {} }
    const tool = createCallOmoAgent(pluginCtx as never, manager as never)

    // #when
    const output = await tool.execute({
      description: "continue",
      prompt: "keep going",
      subagent_type: "X1 - explorer",
      run_in_background: true,
      session_id: "existing-session",
    }, { sessionID: "p1", messageID: "m1", agent: "Musashi", abort: new AbortController().signal } as never)

    // #then
    expect(output).toContain("session_id is not supported in background mode")
  })

  it("#given valid background input #when execute #then launches task and attaches metadata", async () => {
    // #given
    const launchSpy = spyOn(
      {
        launch: async (_input: unknown) => ({
          id: "task-123",
          sessionID: "session-123",
          description: "collect docs",
          agent: "R2 - researcher",
          status: "running",
        }),
      },
      "launch"
    )
    const manager = { launch: launchSpy }
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []
    const pluginCtx = { client: {} }
    const tool = createCallOmoAgent(pluginCtx as never, manager as never)

    // #when
    const output = await tool.execute(
      {
        description: "collect docs",
        prompt: "search all changelog notes",
        subagent_type: "R2 - researcher",
        run_in_background: true,
      },
      {
        sessionID: "parent-session",
        messageID: "msg-11",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(launchSpy).toHaveBeenCalledTimes(1)
    expect(metadataCalls[0]).toEqual({ title: "collect docs", metadata: { sessionId: "session-123" } })
    expect(output).toContain("Task ID: task-123")
    expect(output).toContain("Agent: R2 - researcher (subagent)")
    restores.push(() => launchSpy.mockRestore())
  })
})
