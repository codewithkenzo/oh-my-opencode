import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { PluginInput } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../../features/background-agent"
import { _resetForTesting, setMainSession, subagentSessions } from "../../features/claude-code-session-state"
import { createTodoContinuationEnforcerHook, type TodoContinuationEnforcerOptions } from "."

interface MockMessage {
  info: {
    id: string
    role: "user" | "assistant"
    error?: { name: string; data?: { message: string } }
    sessionID?: string
    agent?: string
    model?: { providerID: string; modelID: string }
    modelID?: string
    providerID?: string
    tools?: Record<string, unknown>
  }
}

describe("todo-continuation-enforcer", () => {
  let promptCalls: Array<{ sessionID: string; agent?: string; model?: { providerID?: string; modelID?: string }; text: string }>
  let toastCalls: Array<{ title: string; message: string }>
  let mockMessages: MockMessage[]
  let testDir: string
  let todoData: Array<{ id: string; content: string; status: string; priority: string }>

  const waitTick = async (ms = 10): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  const createMockBoulderDir = (withActivePlan = true): void => {
    mkdirSync(join(testDir, ".musashi"), { recursive: true })
    if (!withActivePlan) {
      return
    }

    writeFileSync(
      join(testDir, ".musashi", "boulder.json"),
      JSON.stringify({
        active_plan: "/path/to/plan.md",
        started_at: new Date().toISOString(),
        session_ids: ["test-session"],
        plan_name: "test-plan",
      })
    )
  }

  const createMockPluginInput = (directory: string): PluginInput => {
    const input = {
      client: {
        session: {
          todo: async () => ({ data: todoData }),
          messages: async () => ({ data: mockMessages }),
          prompt: async (opts: {
            path: { id: string }
            body: {
              agent?: string
              model?: { providerID?: string; modelID?: string }
              parts: Array<{ text: string }>
            }
          }) => {
            promptCalls.push({
              sessionID: opts.path.id,
              agent: opts.body.agent,
              model: opts.body.model,
              text: opts.body.parts[0]?.text ?? "",
            })
            return {}
          },
        },
        tui: {
          showToast: async (opts: { body: { title: string; message: string } }) => {
            toastCalls.push({
              title: opts.body.title,
              message: opts.body.message,
            })
            return {}
          },
        },
      },
      directory,
    }

    return input as unknown as PluginInput
  }

  const createMockBackgroundManager = (runningTasks = false): BackgroundManager => {
    const manager = {
      getTasksByParentSession: () => (runningTasks ? [{ status: "running" }] : []),
    }
    return manager as unknown as BackgroundManager
  }

  const createHook = (opts: TodoContinuationEnforcerOptions = {}) => {
    return createTodoContinuationEnforcerHook(createMockPluginInput(testDir), {
      countdownSeconds: 0,
      ...opts,
    })
  }

  beforeEach(() => {
    _resetForTesting()
    promptCalls = []
    toastCalls = []
    mockMessages = []
    todoData = [
      { id: "1", content: "Task 1", status: "pending", priority: "high" },
      { id: "2", content: "Task 2", status: "completed", priority: "medium" },
    ]
    testDir = join(tmpdir(), `todo-enforcer-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    createMockBoulderDir(true)
  })

  afterEach(() => {
    _resetForTesting()
    rmSync(testDir, { recursive: true, force: true })
  })

  test("should inject continuation when idle with incomplete todos", async () => {
    const sessionID = "main-123"
    setMainSession(sessionID)

    const hook = createHook({ backgroundManager: createMockBackgroundManager(false) })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(toastCalls.length).toBeGreaterThanOrEqual(1)
    expect(toastCalls[0]?.title).toBe("Todo Continuation")
    expect(promptCalls.length).toBe(1)
    expect(promptCalls[0]?.text).toContain("TODO CONTINUATION")
  })

  test("should not fire when no boulder state exists", async () => {
    const sessionID = "main-no-boulder"
    setMainSession(sessionID)

    rmSync(join(testDir, ".musashi", "boulder.json"), { force: true })
    const hook = createHook()

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
    expect(toastCalls).toHaveLength(0)
  })

  test("should not inject when all todos are complete", async () => {
    const sessionID = "main-456"
    setMainSession(sessionID)
    todoData = [{ id: "1", content: "Task 1", status: "completed", priority: "high" }]

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should not inject when background tasks are running", async () => {
    const sessionID = "main-789"
    setMainSession(sessionID)

    const hook = createHook({ backgroundManager: createMockBackgroundManager(true) })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should not inject for non-main session", async () => {
    setMainSession("main-session")
    const hook = createHook()

    await hook.handler({ event: { type: "session.idle", properties: { sessionID: "other-session" } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should inject for background task session (subagent)", async () => {
    setMainSession("main-session")
    const bgTaskSession = "bg-task-session"
    subagentSessions.add(bgTaskSession)

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID: bgTaskSession } } })
    await waitTick()

    expect(promptCalls.length).toBe(1)
    expect(promptCalls[0]?.sessionID).toBe(bgTaskSession)
  })

  test("should cancel countdown on user message after grace period", async () => {
    const sessionID = "main-cancel"
    setMainSession(sessionID)
    const hook = createHook({ countdownSeconds: 0.6 })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick(520)
    await hook.handler({
      event: { type: "message.updated", properties: { info: { sessionID, role: "user" } } },
    })
    await waitTick(120)

    expect(promptCalls).toHaveLength(0)
  })

  test("should ignore user message within grace period", async () => {
    const sessionID = "main-grace"
    setMainSession(sessionID)
    const hook = createHook({ countdownSeconds: 0.6 })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await hook.handler({
      event: { type: "message.updated", properties: { info: { sessionID, role: "user" } } },
    })
    await waitTick(700)

    expect(promptCalls).toHaveLength(1)
  })

  test("should cancel countdown on assistant activity", async () => {
    const sessionID = "main-assistant"
    setMainSession(sessionID)
    const hook = createHook({ countdownSeconds: 0.1 })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()
    await hook.handler({
      event: { type: "message.part.updated", properties: { info: { sessionID, role: "assistant" } } },
    })
    await waitTick(130)

    expect(promptCalls).toHaveLength(0)
  })

  test("should cancel countdown on tool execution", async () => {
    const sessionID = "main-tool"
    setMainSession(sessionID)
    const hook = createHook({ countdownSeconds: 0.1 })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()
    await hook.handler({ event: { type: "tool.execute.before", properties: { sessionID } } })
    await waitTick(130)

    expect(promptCalls).toHaveLength(0)
  })

  test("should skip injection during recovery mode", async () => {
    const sessionID = "main-recovery"
    setMainSession(sessionID)

    const hook = createHook()
    hook.markRecovering(sessionID)

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should inject after recovery complete", async () => {
    const sessionID = "main-recovery-done"
    setMainSession(sessionID)

    const hook = createHook()
    hook.markRecovering(sessionID)
    hook.markRecoveryComplete(sessionID)

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(1)
  })

  test("should cleanup on session deleted", async () => {
    const sessionID = "main-delete"
    setMainSession(sessionID)
    const hook = createHook({ countdownSeconds: 0.1 })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await hook.handler({ event: { type: "session.deleted", properties: { info: { id: sessionID } } } })
    await waitTick(130)

    expect(promptCalls).toHaveLength(0)
  })

  test("should accept skipAgents option without error", async () => {
    const sessionID = "main-prometheus-option"
    setMainSession(sessionID)
    const hook = createHook({ skipAgents: ["Prometheus (Planner)", "custom-agent"] })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(toastCalls.length).toBeGreaterThanOrEqual(1)
  })

  test("should show countdown toast updates", async () => {
    const sessionID = "main-toast"
    setMainSession(sessionID)
    const hook = createHook()

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(toastCalls.length).toBeGreaterThanOrEqual(1)
    expect(toastCalls[0]?.message).toContain("0s")
  })

  test("should not have 10s throttle between injections", async () => {
    const sessionID = "main-no-throttle"
    setMainSession(sessionID)
    const hook = createHook()

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()
    expect(promptCalls.length).toBe(1)

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()
    expect(promptCalls.length).toBe(2)
  })

  test("should NOT skip for non-abort errors even if immediately before idle", async () => {
    const sessionID = "main-noabort-error"
    setMainSession(sessionID)
    const hook = createHook()

    await hook.handler({
      event: {
        type: "session.error",
        properties: { sessionID, error: { name: "NetworkError", message: "Connection failed" } },
      },
    })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls.length).toBe(1)
  })

  test("should skip injection when last assistant message has MessageAbortedError", async () => {
    const sessionID = "main-api-abort"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "user" } },
      { info: { id: "msg-2", role: "assistant", error: { name: "MessageAbortedError", data: { message: "aborted" } } } },
    ]

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should inject when last assistant message has no error", async () => {
    const sessionID = "main-api-no-error"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "user" } },
      { info: { id: "msg-2", role: "assistant" } },
    ]

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls.length).toBe(1)
  })

  test("should inject when last message is from user (not assistant)", async () => {
    const sessionID = "main-api-user-last"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "assistant" } },
      { info: { id: "msg-2", role: "user" } },
    ]

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls.length).toBe(1)
  })

  test("should skip when last assistant message has any abort-like error", async () => {
    const sessionID = "main-api-abort-dom"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "user" } },
      { info: { id: "msg-2", role: "assistant", error: { name: "AbortError" } } },
    ]

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should skip injection when abort detected via session.error event (event-based, primary)", async () => {
    const sessionID = "main-event-abort"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "user" } },
      { info: { id: "msg-2", role: "assistant" } },
    ]

    const hook = createHook()
    await hook.handler({
      event: { type: "session.error", properties: { sessionID, error: { name: "MessageAbortedError" } } },
    })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should skip injection when AbortError detected via session.error event", async () => {
    const sessionID = "main-event-abort-dom"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "user" } },
      { info: { id: "msg-2", role: "assistant" } },
    ]

    const hook = createHook()
    await hook.handler({
      event: { type: "session.error", properties: { sessionID, error: { name: "AbortError" } } },
    })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should clear permanent cancel flag on user re-engagement", async () => {
    const sessionID = "main-clear-on-user"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "user" } },
      { info: { id: "msg-2", role: "assistant" } },
    ]

    const hook = createHook({ countdownSeconds: 0.2 })

    await hook.handler({
      event: { type: "session.error", properties: { sessionID, error: { name: "MessageAbortedError" } } },
    })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick(20)
    expect(promptCalls).toHaveLength(0)

    await waitTick(520)
    await hook.handler({
      event: { type: "message.updated", properties: { info: { sessionID, role: "user" } } },
    })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick(260)

    expect(promptCalls.length).toBe(1)
  })

  test("should keep permanent cancel flag after assistant message activity", async () => {
    const sessionID = "main-clear-on-assistant"
    setMainSession(sessionID)
    const hook = createHook()

    await hook.handler({
      event: { type: "session.error", properties: { sessionID, error: { name: "MessageAbortedError" } } },
    })
    await hook.handler({
      event: { type: "message.updated", properties: { info: { sessionID, role: "assistant" } } },
    })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should keep permanent cancel flag after tool execution", async () => {
    const sessionID = "main-clear-on-tool"
    setMainSession(sessionID)
    const hook = createHook()

    await hook.handler({
      event: { type: "session.error", properties: { sessionID, error: { name: "MessageAbortedError" } } },
    })
    await hook.handler({ event: { type: "tool.execute.before", properties: { sessionID } } })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should permanently stop after Esc until user re-engages", async () => {
    const sessionID = "main-permanent-stop"
    setMainSession(sessionID)
    const hook = createHook()

    await hook.handler({
      event: { type: "session.error", properties: { sessionID, error: { name: "AbortError" } } },
    })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()
    expect(promptCalls).toHaveLength(0)

    await waitTick(520)
    await hook.handler({
      event: { type: "message.updated", properties: { info: { sessionID, role: "user" } } },
    })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls.length).toBe(1)
  })

  test("should use event-based detection even when API indicates no abort (event wins)", async () => {
    const sessionID = "main-event-wins"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "user" } },
      { info: { id: "msg-2", role: "assistant" } },
    ]

    const hook = createHook()
    await hook.handler({
      event: { type: "session.error", properties: { sessionID, error: { name: "MessageAbortedError" } } },
    })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should use API fallback when event is missed but API shows abort", async () => {
    const sessionID = "main-api-fallback"
    setMainSession(sessionID)
    mockMessages = [
      { info: { id: "msg-1", role: "user" } },
      { info: { id: "msg-2", role: "assistant", error: { name: "MessageAbortedError" } } },
    ]

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls).toHaveLength(0)
  })

  test("should pass model property in prompt call (undefined when no message context)", async () => {
    const sessionID = "main-model-preserve"
    setMainSession(sessionID)
    const hook = createHook({ backgroundManager: createMockBackgroundManager(false) })

    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls.length).toBe(1)
    expect(promptCalls[0]?.text).toContain("TODO CONTINUATION")
    expect("model" in (promptCalls[0] ?? {})).toBe(true)
  })

  test("should extract model from assistant message with flat modelID/providerID", async () => {
    const sessionID = "main-assistant-model"
    setMainSession(sessionID)

    mockMessages = [
      { info: { id: "msg-1", role: "user", agent: "Sisyphus", model: { providerID: "openai", modelID: "gpt-5.2" } } },
      { info: { id: "msg-2", role: "assistant", agent: "Sisyphus", modelID: "gpt-5.2", providerID: "openai" } },
    ]

    const hook = createHook({ backgroundManager: createMockBackgroundManager(false) })
    await hook.handler({ event: { type: "session.idle", properties: { sessionID } } })
    await waitTick()

    expect(promptCalls.length).toBe(1)
    expect(promptCalls[0]?.model).toEqual({ providerID: "openai", modelID: "gpt-5.2" })
  })
})
