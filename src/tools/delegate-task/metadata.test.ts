import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

import { clearPendingStore, consumeToolMetadata } from "../../features/tool-metadata-store"

async function loadCreateDelegateTask() {
  const restores: unknown[] = []

  restores.push(mock.module("../../features/opencode-skill-loader/skill-content", () => ({
    resolveMultipleSkillsAsync: async () => ({ resolved: new Map(), notFound: [] }),
  })))

  restores.push(mock.module("../../features/task-toast-manager", () => ({
    getTaskToastManager: () => undefined,
  })))

  restores.push(mock.module("../../features/task-toast-manager/index.ts", () => ({
    getTaskToastManager: () => undefined,
  })))

  restores.push(mock.module("/home/kenzo/dev/oh-my-opencode-v3/src/features/task-toast-manager/index.ts", () => ({
    getTaskToastManager: () => undefined,
  })))

  restores.push(mock.module("../../features/claude-code-session-state", () => ({
    subagentSessions: new Set<string>(),
    getSessionAgent: () => undefined,
  })))

  restores.push(mock.module("../../features/claude-code-session-state/state", () => ({
    subagentSessions: new Set<string>(),
    getSessionAgent: () => undefined,
  })))

  const { createDelegateTask } = await import("./tools")

  return {
    createDelegateTask,
    restore() {
      for (const restore of restores.splice(0)) {
        if (typeof restore === "function") restore()
      }
    },
  }
}

const SYSTEM_DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"

let createDelegateTaskLocal: Awaited<ReturnType<typeof loadCreateDelegateTask>>["createDelegateTask"]

function createBackgroundTool(options: {
  manager: Record<string, unknown>
  userCategories?: Record<string, { model?: string }>
  userCategorySkills?: Record<string, string[]>
}) {
  return createDelegateTaskLocal({
    manager: options.manager as never,
    directory: "/repo",
    client: {
      app: { agents: async () => ({ data: [] }) },
      config: { get: async () => ({ data: { model: SYSTEM_DEFAULT_MODEL } }) },
    } as never,
    userCategories: options.userCategories as never,
    userCategorySkills: options.userCategorySkills,
  })
}

function createToolContext(options?: {
  callID?: string
  metadata?: (input: { title?: string; metadata?: Record<string, unknown> }) => void | Promise<void>
}) {
  return {
    sessionID: "parent-session",
    callID: options?.callID,
    messageID: "msg-delegate-1",
    agent: "Sisyphus",
    abort: new AbortController().signal,
    metadata: options?.metadata,
  } as never
}

describe("delegate_task background metadata contract", () => {
  let restoreMocks: (() => void) | undefined

  beforeEach(async () => {
    clearPendingStore()
    const loaded = await loadCreateDelegateTask()
    createDelegateTaskLocal = loaded.createDelegateTask
    restoreMocks = loaded.restore
  })

  afterEach(() => {
    restoreMocks?.()
    restoreMocks = undefined
  })

  test("#given resolved background task #when execute runs #then output includes task metadata block with all ids", async () => {
    // #given
    const tool = createBackgroundTool({
      manager: {
        launch: async () => ({
          id: "bg_delegate_1",
          sessionID: "ses_child_1",
          description: "Collect refs",
          agent: "D5 - backend builder",
          status: "running",
        }),
      },
      userCategorySkills: { ultrabrain: [] },
    })

    // #when
    const output = await tool.execute(
      {
        description: "Collect refs",
        prompt: "find references",
        category: "ultrabrain",
        run_in_background: true,
        skills: [],
      },
      createToolContext({ callID: "call-delegate-1" }),
    )

    // #then
    expect(output).toContain("Background Task ID: bg_delegate_1")
    expect(output).toContain("<task_metadata>")
    expect(output).toContain("session_id: ses_child_1")
    expect(output).toContain("task_id: ses_child_1")
    expect(output).toContain("background_task_id: bg_delegate_1")
    expect(output).toContain("</task_metadata>")
  })

  test("#given unresolved background task #when execute runs #then output omits task metadata block and fake session markers", async () => {
    // #given
    const tool = createBackgroundTool({
      manager: {
        launch: async () => ({
          id: "bg_delegate_2",
          sessionID: undefined,
          description: "Collect refs",
          agent: "D5 - backend builder",
          status: "running",
        }),
      },
      userCategorySkills: { ultrabrain: [] },
    })

    // #when
    const output = await tool.execute(
      {
        description: "Collect refs",
        prompt: "find references",
        category: "ultrabrain",
        run_in_background: true,
        skills: [],
      },
      createToolContext({ callID: "call-delegate-2" }),
    )

    // #then
    expect(output).toContain("Background Task ID: bg_delegate_2")
    expect(output).not.toContain("<task_metadata>")
    expect(output).not.toContain("session_id:")
    expect(output).not.toContain("task_id:")
    expect(output).not.toContain("background_task_id:")
    expect(output).not.toContain("Session ID: undefined")
  })

  test("#given delayed background session resolution #when execute runs #then output emits task metadata block with late session id", async () => {
    // #given
    let getTaskCalls = 0
    const tool = createBackgroundTool({
      manager: {
        launch: async () => ({
          id: "bg_delegate_3",
          sessionID: undefined,
          description: "Collect refs",
          agent: "D5 - backend builder",
          status: "pending",
        }),
        getTask: () => {
          getTaskCalls += 1
          return getTaskCalls < 2
            ? {
                id: "bg_delegate_3",
                sessionID: undefined,
                description: "Collect refs",
                agent: "D5 - backend builder",
                status: "pending",
              }
            : {
                id: "bg_delegate_3",
                sessionID: "ses_child_late",
                description: "Collect refs",
                agent: "D5 - backend builder",
                status: "running",
              }
        },
      },
      userCategorySkills: { ultrabrain: [] },
    })

    // #when
    const output = await tool.execute(
      {
        description: "Collect refs",
        prompt: "find references",
        category: "ultrabrain",
        run_in_background: true,
        skills: [],
      },
      createToolContext({ callID: "call-delegate-3" }),
    )

    // #then
    expect(output).toContain("Background Task ID: bg_delegate_3")
    expect(output).toContain("<task_metadata>")
    expect(output).toContain("session_id: ses_child_late")
    expect(output).toContain("task_id: ses_child_late")
    expect(output).toContain("background_task_id: bg_delegate_3")
  })

  test("#given background launch metadata #when execute resolves #then metadata contains upstream-compatible fields and awaits metadata hook", async () => {
    // #given
    const metadataCalls: Array<{ title?: string; metadata?: Record<string, unknown> }> = []
    const tool = createBackgroundTool({
      manager: {
        launch: async () => ({
          id: "bg_delegate_4",
          sessionID: "ses_child_rich",
          description: "Collect refs",
          agent: "D5 - backend builder",
          status: "running",
        }),
      },
      userCategories: {
        ultrabrain: { model: "openai/gpt-5.2" },
      },
      userCategorySkills: { ultrabrain: [] },
    })

    // #when
    await tool.execute(
      {
        description: "Collect refs",
        prompt: "find references",
        category: "ultrabrain",
        run_in_background: true,
        skills: ["custom-skill"],
      },
      createToolContext({
        callID: "call-delegate-4",
        metadata: async (input) => {
          await new Promise(resolve => setTimeout(resolve, 5))
          metadataCalls.push(input)
        },
      }),
    )

    // #then
    expect(metadataCalls).toEqual([
      {
        title: "Collect refs",
        metadata: {
          prompt: "find references",
          agent: "D5 - backend builder",
          category: "ultrabrain",
          load_skills: ["custom-skill"],
          description: "Collect refs",
          run_in_background: true,
          command: "delegate_task",
          sessionId: "ses_child_rich",
          model: "openai/gpt-5.2",
        },
      },
    ])
    expect(consumeToolMetadata("parent-session", "call-delegate-4")).toEqual({
      title: "Collect refs",
      metadata: {
        prompt: "find references",
        agent: "D5 - backend builder",
        category: "ultrabrain",
        load_skills: ["custom-skill"],
        description: "Collect refs",
        run_in_background: true,
        command: "delegate_task",
        sessionId: "ses_child_rich",
        model: "openai/gpt-5.2",
      },
    })
  })
})
