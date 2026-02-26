import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import type { OhMyOpenCodeConfig } from "../../config/schema"
import { createTaskCreateTool } from "./task-create"

const TEST_STORAGE = ".test-task-create"
const TEST_DIR = join(process.cwd(), TEST_STORAGE)
const TEST_CONFIG = {
  musashi_agent: {
    tasks: {
      storage_path: TEST_STORAGE,
    },
  },
} as unknown as Partial<OhMyOpenCodeConfig>

describe("task_create tool", () => {
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

  test("#given subject #when create task #then writes task file", async () => {
    //#given
    const tool = createTaskCreateTool(TEST_CONFIG)

    //#when
    const result = JSON.parse(
      await tool.execute({ subject: "Implement feature" }, testContext as never),
    )

    //#then
    expect(result.task.id).toMatch(/^T-[a-f0-9-]+$/)
    const taskPath = join(TEST_DIR, `${result.task.id}.json`)
    expect(existsSync(taskPath)).toBe(true)
    const task = await Bun.file(taskPath).json()
    expect((task as { threadID: string }).threadID).toBe("session-1")
  })
})
