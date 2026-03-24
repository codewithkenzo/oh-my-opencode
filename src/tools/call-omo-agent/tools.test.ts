import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"

import { clearPendingStore, consumeToolMetadata } from "../../features/tool-metadata-store"
import { createCallOmoAgent } from "./tools"

describe("call_omo_agent tool", () => {
  const restores: Array<() => void> = []

  beforeEach(() => {
    clearPendingStore()
  })

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
        callID: "call-11",
        messageID: "msg-11",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(launchSpy).toHaveBeenCalledTimes(1)
    expect(metadataCalls[0]).toEqual({ title: "collect docs", metadata: { sessionId: "session-123" } })
    expect(consumeToolMetadata("parent-session", "call-11")).toEqual({
      title: "collect docs",
      metadata: { sessionId: "session-123" },
    })
    expect(output).toContain("Task ID: task-123")
    expect(output).toContain("Agent: R2 - researcher (subagent)")
    restores.push(() => launchSpy.mockRestore())
  })

  it("#given unresolved background session #when execute #then omits sessionId and persists omission", async () => {
    // #given
    const manager = {
      launch: async () => ({
        id: "task-pending",
        sessionID: undefined,
        description: "collect docs",
        agent: "R2 - researcher",
        status: "running",
      }),
    }
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []
    const pluginCtx = { client: {} }
    const tool = createCallOmoAgent(pluginCtx as never, manager as never)

    // #when
    await tool.execute(
      {
        description: "collect docs",
        prompt: "search all changelog notes",
        subagent_type: "R2 - researcher",
        run_in_background: true,
      },
      {
        sessionID: "parent-session",
        callID: "call-pending",
        messageID: "msg-12",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(metadataCalls[0]).toEqual({ title: "collect docs", metadata: {} })
    expect(consumeToolMetadata("parent-session", "call-pending")).toEqual({
      title: "collect docs",
      metadata: {},
    })
  })

  it("#given delayed background session assignment #when execute #then persists resolved session metadata", async () => {
    // #given
    let getTaskCalls = 0
    const manager = {
      launch: async () => ({
        id: "task-delayed",
        sessionID: undefined,
        description: "collect docs",
        agent: "R2 - researcher",
        status: "pending",
      }),
      getTask: () => {
        getTaskCalls += 1
        return getTaskCalls < 2
          ? {
              id: "task-delayed",
              sessionID: undefined,
              description: "collect docs",
              agent: "R2 - researcher",
              status: "pending",
            }
          : {
              id: "task-delayed",
              sessionID: "ses_child",
              description: "collect docs",
              agent: "R2 - researcher",
              status: "running",
            }
      },
    }
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
        callID: "call-delayed",
        messageID: "msg-13",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(output).toContain("Session ID: ses_child")
    expect(metadataCalls[0]).toEqual({ title: "collect docs", metadata: { sessionId: "ses_child" } })
    expect(consumeToolMetadata("parent-session", "call-delayed")).toEqual({
      title: "collect docs",
      metadata: { sessionId: "ses_child" },
    })
  })

  it("#given runtime background context without callID #when execute #then queues metadata for later restore", async () => {
    // #given
    const manager = {
      launch: async () => ({
        id: "task-runtime",
        sessionID: "session-runtime-123",
        description: "collect docs",
        agent: "R2 - researcher",
        status: "running",
      }),
    }
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []
    const pluginCtx = { client: {} }
    const tool = createCallOmoAgent(pluginCtx as never, manager as never)

    // #when
    await tool.execute(
      {
        description: "collect docs",
        prompt: "search all changelog notes",
        subagent_type: "R2 - researcher",
        run_in_background: true,
      },
      {
        sessionID: "parent-session",
        messageID: "msg-runtime",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(metadataCalls[0]).toEqual({ title: "collect docs", metadata: { sessionId: "session-runtime-123" } })
    expect(consumeToolMetadata("parent-session", "after-call-runtime")).toEqual({
      title: "collect docs",
      metadata: { sessionId: "session-runtime-123" },
    })
  })

  it("#given delayed runtime background context without callID #when execute #then later restore gets resolved child session", async () => {
    // #given
    let getTaskCalls = 0
    const manager = {
      launch: async () => ({
        id: "task-runtime-delayed",
        sessionID: undefined,
        description: "collect docs",
        agent: "R2 - researcher",
        status: "pending",
      }),
      getTask: () => {
        getTaskCalls += 1
        return getTaskCalls < 2
          ? {
              id: "task-runtime-delayed",
              sessionID: undefined,
              description: "collect docs",
              agent: "R2 - researcher",
              status: "pending",
            }
          : {
              id: "task-runtime-delayed",
              sessionID: "session-runtime-delayed-123",
              description: "collect docs",
              agent: "R2 - researcher",
              status: "running",
            }
      },
    }
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []
    const pluginCtx = { client: {} }
    const tool = createCallOmoAgent(pluginCtx as never, manager as never)

    // #when
    await tool.execute(
      {
        description: "collect docs",
        prompt: "search all changelog notes",
        subagent_type: "R2 - researcher",
        run_in_background: true,
      },
      {
        sessionID: "parent-session",
        messageID: "msg-runtime-delayed",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(metadataCalls[0]).toEqual({ title: "collect docs", metadata: { sessionId: "session-runtime-delayed-123" } })
    expect(consumeToolMetadata("parent-session", "after-call-runtime-delayed")).toEqual({
      title: "collect docs",
      metadata: { sessionId: "session-runtime-delayed-123" },
    })
  })

  it("#given sync launcher path #when execute creates a child session #then persists metadata for restoration", async () => {
    // #given
    const pluginCtx = {
      directory: "/repo",
      client: {
        session: {
          get: async ({ path }: { path: { id: string } }) => ({
            data: path.id === "parent-session" ? { directory: "/repo" } : { id: path.id },
          }),
          create: async () => ({ data: { id: "sync-session-123" } }),
          prompt: async () => ({ data: {} }),
          status: async () => ({ data: { "sync-session-123": { type: "idle" } } }),
          messages: async () => ({
            data: [
              {
                info: { role: "assistant", time: { created: Date.now() } },
                parts: [{ type: "text", text: "done" }],
              },
            ],
          }),
        },
      },
    }
    const tool = createCallOmoAgent(pluginCtx as never, { launch: async () => ({}) } as never)
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []

    // #when
    await tool.execute(
      {
        description: "collect docs",
        prompt: "search all changelog notes",
        subagent_type: "R2 - researcher",
        run_in_background: false,
      },
      {
        sessionID: "parent-session",
        callID: "call-sync",
        messageID: "msg-sync",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(metadataCalls[0]).toEqual({ title: "collect docs", metadata: { sessionId: "sync-session-123" } })
    expect(consumeToolMetadata("parent-session", "call-sync")).toEqual({
      title: "collect docs",
      metadata: { sessionId: "sync-session-123" },
    })
  })
})
