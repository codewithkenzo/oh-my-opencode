import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"

import { clearPendingStore, consumeToolMetadata } from "../../features/tool-metadata-store"
import { createBackgroundCancel, createBackgroundOutput, createBackgroundTask } from "./tools"

describe("background-task tools", () => {
  const restores: Array<() => void> = []

  beforeEach(() => {
    clearPendingStore()
  })

  afterEach(() => {
    for (const restore of restores.splice(0)) restore()
  })

  it("#given empty agent #when createBackgroundTask executes #then returns validation error", async () => {
    // #given
    const manager = { launch: async () => ({}) }
    const tool = createBackgroundTask(manager as never)

    // #when
    const output = await tool.execute(
      { description: "test", prompt: "hello", agent: "   " },
      { sessionID: "s1", messageID: "m1", agent: "Musashi", abort: new AbortController().signal } as never
    )

    // #then
    expect(output).toContain("Agent parameter is required")
  })

  it("#given pending task #when createBackgroundOutput executes without blocking #then returns status markdown", async () => {
    // #given
    const manager = {
      getTask: () => ({
        id: "task-1",
        sessionID: "session-1",
        parentSessionID: "parent",
        parentMessageID: "msg",
        description: "collect refs",
        prompt: "find references",
        agent: "X1 - explorer",
        status: "pending",
        queuedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    }
    const client = { session: { messages: async () => ({ data: [] }) } }
    const tool = createBackgroundOutput(manager as never, client as never)

    // #when
    const output = await tool.execute({ task_id: "task-1", full_session: false, block: false }, {} as never)

    // #then
    expect(output).toContain("# Task Status")
    expect(output).toContain("**pending**")
    expect(output).toContain("Queued")
  })

  it("#given resolved child session #when createBackgroundTask executes #then persists metadata for restoration", async () => {
    // #given
    const manager = {
      launch: async () => ({
        id: "task-1",
        sessionID: "child-session-1",
        description: "collect refs",
        agent: "X1 - explorer",
        status: "running",
      }),
    }
    const tool = createBackgroundTask(manager as never)
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []

    // #when
    await tool.execute(
      { description: "collect refs", prompt: "find references", agent: "X1 - explorer" },
      {
        sessionID: "parent-session",
        callID: "call-bg-1",
        messageID: "m-bg-1",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(metadataCalls[0]).toEqual({ title: "collect refs", metadata: { sessionId: "child-session-1" } })
    expect(consumeToolMetadata("parent-session", "call-bg-1")).toEqual({
      title: "collect refs",
      metadata: { sessionId: "child-session-1" },
    })
  })

  it("#given unresolved child session #when createBackgroundTask executes #then omits sessionId and persists omission", async () => {
    // #given
    const manager = {
      launch: async () => ({
        id: "task-1",
        sessionID: undefined,
        description: "collect refs",
        agent: "X1 - explorer",
        status: "running",
      }),
    }
    const tool = createBackgroundTask(manager as never)
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []

    // #when
    await tool.execute(
      { description: "collect refs", prompt: "find references", agent: "X1 - explorer" },
      {
        sessionID: "parent-session",
        callID: "call-bg-pending",
        messageID: "m-bg-2",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(metadataCalls[0]).toEqual({ title: "collect refs", metadata: {} })
    expect(consumeToolMetadata("parent-session", "call-bg-pending")).toEqual({
      title: "collect refs",
      metadata: {},
    })
  })

  it("#given delayed child session assignment #when createBackgroundTask executes #then persists resolved session metadata", async () => {
    // #given
    let getTaskCalls = 0
    const manager = {
      launch: async () => ({
        id: "task-delayed",
        sessionID: undefined,
        description: "collect refs",
        agent: "X1 - explorer",
        status: "pending",
      }),
      getTask: () => {
        getTaskCalls += 1
        return getTaskCalls < 2
          ? {
              id: "task-delayed",
              sessionID: undefined,
              description: "collect refs",
              agent: "X1 - explorer",
              status: "pending",
            }
          : {
              id: "task-delayed",
              sessionID: "ses_child",
              description: "collect refs",
              agent: "X1 - explorer",
              status: "running",
            }
      },
    }
    const tool = createBackgroundTask(manager as never)
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []

    // #when
    const output = await tool.execute(
      { description: "collect refs", prompt: "find references", agent: "X1 - explorer" },
      {
        sessionID: "parent-session",
        callID: "call-bg-delayed",
        messageID: "m-bg-3",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(output).toContain("Session ID: ses_child")
    expect(metadataCalls[0]).toEqual({ title: "collect refs", metadata: { sessionId: "ses_child" } })
    expect(consumeToolMetadata("parent-session", "call-bg-delayed")).toEqual({
      title: "collect refs",
      metadata: { sessionId: "ses_child" },
    })
  })

  it("#given runtime context without callID #when createBackgroundTask executes #then queues metadata for later restore", async () => {
    // #given
    const manager = {
      launch: async () => ({
        id: "task-runtime",
        sessionID: "child-session-runtime",
        description: "collect refs",
        agent: "X1 - explorer",
        status: "running",
      }),
    }
    const tool = createBackgroundTask(manager as never)
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []

    // #when
    await tool.execute(
      { description: "collect refs", prompt: "find references", agent: "X1 - explorer" },
      {
        sessionID: "parent-session",
        messageID: "m-bg-runtime",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(metadataCalls[0]).toEqual({ title: "collect refs", metadata: { sessionId: "child-session-runtime" } })
    expect(consumeToolMetadata("parent-session", "after-call-bg-runtime")).toEqual({
      title: "collect refs",
      metadata: { sessionId: "child-session-runtime" },
    })
  })

  it("#given delayed runtime context without callID #when createBackgroundTask executes #then later restore gets resolved child session", async () => {
    // #given
    let getTaskCalls = 0
    const manager = {
      launch: async () => ({
        id: "task-runtime-delayed",
        sessionID: undefined,
        description: "collect refs",
        agent: "X1 - explorer",
        status: "pending",
      }),
      getTask: () => {
        getTaskCalls += 1
        return getTaskCalls < 2
          ? {
              id: "task-runtime-delayed",
              sessionID: undefined,
              description: "collect refs",
              agent: "X1 - explorer",
              status: "pending",
            }
          : {
              id: "task-runtime-delayed",
              sessionID: "ses_child_runtime",
              description: "collect refs",
              agent: "X1 - explorer",
              status: "running",
            }
      },
    }
    const tool = createBackgroundTask(manager as never)
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []

    // #when
    await tool.execute(
      { description: "collect refs", prompt: "find references", agent: "X1 - explorer" },
      {
        sessionID: "parent-session",
        messageID: "m-bg-runtime-delayed",
        agent: "Musashi",
        abort: new AbortController().signal,
        metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => metadataCalls.push(input),
      } as never
    )

    // #then
    expect(metadataCalls[0]).toEqual({ title: "collect refs", metadata: { sessionId: "ses_child_runtime" } })
    expect(consumeToolMetadata("parent-session", "after-call-bg-runtime-delayed")).toEqual({
      title: "collect refs",
      metadata: { sessionId: "ses_child_runtime" },
    })
  })

  it("#given no taskId and all=false #when createBackgroundCancel executes #then returns invalid argument error", async () => {
    // #given
    const manager = {
      getTask: () => null,
      getAllDescendantTasks: () => [],
      cancelPendingTask: () => false,
    }
    const client = { session: { abort: async () => ({}) } }
    const tool = createBackgroundCancel(manager as never, client as never)

    // #when
    const output = await tool.execute({ all: false }, { sessionID: "parent" } as never)

    // #then
    expect(output).toContain("Invalid arguments")
  })

  it("#given running and pending tasks #when cancel all #then aborts running task and cancels pending task", async () => {
    // #given
    const pendingTask = {
      id: "task-p",
      description: "pending job",
      status: "pending",
    }
    const runningTask = {
      id: "task-r",
      description: "running job",
      status: "running",
      sessionID: "session-r",
      completedAt: undefined,
    }
    const cancelPendingSpy = spyOn({ cancelPendingTask: (_id: string) => true }, "cancelPendingTask")
    const abortSpy = spyOn({ abort: async (_args: unknown) => ({}) }, "abort")
    const manager = {
      getAllDescendantTasks: () => [pendingTask, runningTask],
      cancelPendingTask: cancelPendingSpy,
    }
    const client = { session: { abort: abortSpy } }
    restores.push(() => cancelPendingSpy.mockRestore(), () => abortSpy.mockRestore())
    const tool = createBackgroundCancel(manager as never, client as never)

    // #when
    const output = await tool.execute({ all: true }, { sessionID: "parent-session" } as never)

    // #then
    expect(cancelPendingSpy).toHaveBeenCalledWith("task-p")
    expect(abortSpy).toHaveBeenCalledWith({ path: { id: "session-r" } })
    expect(output).toContain("Cancelled 2 background task(s)")
  })
})
