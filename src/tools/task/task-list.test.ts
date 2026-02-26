import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { OhMyOpenCodeConfig } from "../../config/schema"
import { createTaskList } from "./task-list"

const TEST_STORAGE = ".test-task-list"
const TEST_DIR = join(process.cwd(), TEST_STORAGE)
const TEST_CONFIG = {
  musashi_agent: {
    tasks: {
      storage_path: TEST_STORAGE,
    },
  },
} as unknown as Partial<OhMyOpenCodeConfig>

describe("task_list tool", () => {
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

  test("#given mixed statuses #when list #then excludes completed and deleted", async () => {
    //#given
    const baseTask = {
      description: "",
      blocks: [],
      blockedBy: [],
      threadID: "session-1",
    }
    writeFileSync(join(TEST_DIR, "T-1.json"), JSON.stringify({ ...baseTask, id: "T-1", subject: "Active", status: "pending" }), "utf-8")
    writeFileSync(
      join(TEST_DIR, "T-2.json"),
      JSON.stringify({ ...baseTask, id: "T-2", subject: "Done", status: "completed" }),
      "utf-8",
    )
    writeFileSync(
      join(TEST_DIR, "T-3.json"),
      JSON.stringify({ ...baseTask, id: "T-3", subject: "Removed", status: "deleted" }),
      "utf-8",
    )

    //#when
    const tool = createTaskList(TEST_CONFIG)
    const result = JSON.parse(await tool.execute({}, testContext as never))

    //#then
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].id).toBe("T-1")
  })
})
