import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"
import { tmpdir } from "node:os"
import { BackgroundManager } from "./manager"
import type { BackgroundTask } from "./types"
import { _resetForTesting, subagentSessions } from "../claude-code-session-state"

function createManager(): BackgroundManager {
  const client = {
    session: {
      prompt: async () => ({}),
    },
  }

  return new BackgroundManager({ client, directory: tmpdir() } as unknown as PluginInput)
}

function getTaskMap(manager: BackgroundManager): Map<string, BackgroundTask> {
  return (manager as unknown as { tasks: Map<string, BackgroundTask> }).tasks
}

function getPendingByParentMap(manager: BackgroundManager): Map<string, Set<string>> {
  return (manager as unknown as { pendingByParent: Map<string, Set<string>> }).pendingByParent
}

function getNotificationsMap(manager: BackgroundManager): Map<string, BackgroundTask[]> {
  return (manager as unknown as { notifications: Map<string, BackgroundTask[]> }).notifications
}

function createTask(overrides: Partial<BackgroundTask> & {
  id: string
  parentSessionID: string
  status: BackgroundTask["status"]
}): BackgroundTask {
  return {
    id: overrides.id,
    sessionID: overrides.sessionID,
    parentSessionID: overrides.parentSessionID,
    parentMessageID: overrides.parentMessageID ?? "parent-message",
    description: overrides.description ?? "background task",
    prompt: overrides.prompt ?? "prompt",
    agent: overrides.agent ?? "explore",
    status: overrides.status,
    startedAt: overrides.startedAt,
    queuedAt: overrides.queuedAt,
    concurrencyKey: overrides.concurrencyKey,
    completedAt: overrides.completedAt,
    error: overrides.error,
  }
}

describe("BackgroundManager session.deleted cascade cancel", () => {
  let manager: BackgroundManager

  beforeEach(() => {
    // #given
    _resetForTesting()
    manager = createManager()
  })

  afterEach(() => {
    manager.shutdown()
    _resetForTesting()
  })

  test("should cancel and clean a single matching task", () => {
    // #given
    const task = createTask({
      id: "task-direct",
      sessionID: "session-direct",
      parentSessionID: "session-parent",
      status: "running",
      startedAt: new Date(),
      concurrencyKey: "anthropic/claude-opus-4-5",
    })

    getTaskMap(manager).set(task.id, task)
    getPendingByParentMap(manager).set(task.parentSessionID, new Set([task.id]))
    getNotificationsMap(manager).set("session-parent", [task])
    subagentSessions.add("session-direct")

    const event: Parameters<BackgroundManager["handleEvent"]>[0] = {
      type: "session.deleted",
      properties: { info: { id: "session-direct" } },
    }

    // #when
    manager.handleEvent(event)

    // #then
    expect(task.status).toBe("cancelled")
    expect(task.error).toBe("Session deleted")
    expect(task.completedAt).toBeInstanceOf(Date)
    expect(task.concurrencyKey).toBeUndefined()
    expect(manager.getTask(task.id)).toBeUndefined()
    expect(getPendingByParentMap(manager).has(task.parentSessionID)).toBe(false)
    expect(getNotificationsMap(manager).size).toBe(0)
    expect(subagentSessions.has("session-direct")).toBe(false)
  })

  test("should cascade-cancel descendants when parent session is deleted", () => {
    // #given
    const parentTask = createTask({
      id: "task-parent",
      sessionID: "session-parent-task",
      parentSessionID: "root-session",
      status: "running",
      startedAt: new Date(),
      concurrencyKey: "anthropic/claude-opus-4-5",
    })
    const childTask = createTask({
      id: "task-child",
      sessionID: "session-child-task",
      parentSessionID: "session-parent-task",
      status: "running",
      startedAt: new Date(),
      concurrencyKey: "openai/gpt-5.2",
    })
    const grandChildPendingTask = createTask({
      id: "task-grandchild-pending",
      parentSessionID: "session-child-task",
      status: "pending",
      queuedAt: new Date(),
    })

    const taskMap = getTaskMap(manager)
    taskMap.set(parentTask.id, parentTask)
    taskMap.set(childTask.id, childTask)
    taskMap.set(grandChildPendingTask.id, grandChildPendingTask)

    getPendingByParentMap(manager).set(parentTask.parentSessionID, new Set([parentTask.id]))
    getPendingByParentMap(manager).set(childTask.parentSessionID, new Set([childTask.id]))
    getPendingByParentMap(manager).set(grandChildPendingTask.parentSessionID, new Set([grandChildPendingTask.id]))
    getNotificationsMap(manager).set("root-session", [parentTask, childTask, grandChildPendingTask])

    subagentSessions.add("session-parent-task")
    subagentSessions.add("session-child-task")

    const event: Parameters<BackgroundManager["handleEvent"]>[0] = {
      type: "session.deleted",
      properties: { info: { id: "session-parent-task" } },
    }

    // #when
    manager.handleEvent(event)

    // #then
    expect(parentTask.status).toBe("cancelled")
    expect(childTask.status).toBe("cancelled")
    expect(grandChildPendingTask.status).toBe("cancelled")
    expect(parentTask.error).toBe("Session deleted")
    expect(childTask.error).toBe("Session deleted")
    expect(grandChildPendingTask.error).toBe("Session deleted")
    expect(parentTask.completedAt).toBeInstanceOf(Date)
    expect(childTask.completedAt).toBeInstanceOf(Date)
    expect(grandChildPendingTask.completedAt).toBeInstanceOf(Date)

    expect(parentTask.concurrencyKey).toBeUndefined()
    expect(childTask.concurrencyKey).toBeUndefined()

    expect(manager.getTask(parentTask.id)).toBeUndefined()
    expect(manager.getTask(childTask.id)).toBeUndefined()
    expect(manager.getTask(grandChildPendingTask.id)).toBeUndefined()

    expect(getPendingByParentMap(manager).size).toBe(0)
    expect(getNotificationsMap(manager).size).toBe(0)
    expect(subagentSessions.has("session-parent-task")).toBe(false)
    expect(subagentSessions.has("session-child-task")).toBe(false)
  })

  test("should no-op for unknown deleted session", () => {
    // #given
    const unaffectedTask = createTask({
      id: "task-unaffected",
      sessionID: "session-unaffected",
      parentSessionID: "session-parent",
      status: "running",
      startedAt: new Date(),
    })
    getTaskMap(manager).set(unaffectedTask.id, unaffectedTask)

    const event: Parameters<BackgroundManager["handleEvent"]>[0] = {
      type: "session.deleted",
      properties: { info: { id: "session-unknown" } },
    }

    // #when
    expect(() => manager.handleEvent(event)).not.toThrow()

    // #then
    expect(manager.getTask(unaffectedTask.id)).toBeDefined()
    expect(unaffectedTask.status).toBe("running")
    expect(unaffectedTask.completedAt).toBeUndefined()
  })
})
