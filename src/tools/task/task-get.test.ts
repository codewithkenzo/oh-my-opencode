import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { OhMyOpenCodeConfig } from "../../config/schema"
import { createTaskGetTool } from "./task-get"

const TEST_STORAGE = ".test-task-get"
const TEST_DIR = join(process.cwd(), TEST_STORAGE)
const TEST_CONFIG = {
  musashi_agent: {
    tasks: {
      storage_path: TEST_STORAGE,
    },
  },
} as unknown as Partial<OhMyOpenCodeConfig>

describe("task_get tool", () => {
  const testContext = {
    sessionID: "session-1",
    messageID: "msg-1",
    agent: "test",
    abort: new AbortController().signal,
    directory: process.cwd(),
    worktree: process.cwd(),
    metadata: () => {},
    ask: async () => "",
  }

  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  test("#given existing task #when get by id #then returns task", async () => {
    //#given
    const taskId = "T-test-123"
    writeFileSync(
      join(TEST_DIR, `${taskId}.json`),
      JSON.stringify({
        id: taskId,
        subject: "My Task",
        description: "",
        status: "pending",
        blocks: [],
        blockedBy: [],
        threadID: "session-1",
      }),
      "utf-8",
    )

    //#when
    const tool = createTaskGetTool(TEST_CONFIG)
    const result = JSON.parse(await tool.execute({ id: taskId }, testContext as never))

    //#then
    expect(result.task.id).toBe(taskId)
    expect(result.task.subject).toBe("My Task")
  })

  test("#given missing task #when get by id #then returns null", async () => {
    //#when
    const tool = createTaskGetTool(TEST_CONFIG)
    const result = JSON.parse(await tool.execute({ id: "T-missing-999" }, testContext as never))

    //#then
    expect(result.task).toBeNull()
  })
})
