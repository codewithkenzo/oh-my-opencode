import { afterEach, describe, expect, it, spyOn } from "bun:test"
import { createBackgroundCancel, createBackgroundOutput, createBackgroundTask } from "./tools"

describe("background-task tools", () => {
  const restores: Array<() => void> = []

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
