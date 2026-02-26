import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { OhMyOpenCodeConfig } from "../../config/schema"
import { createTaskUpdateTool } from "./task-update"

const TEST_STORAGE = ".test-task-update"
const TEST_DIR = join(process.cwd(), TEST_STORAGE)
const TEST_CONFIG = {
  musashi_agent: {
    tasks: {
      storage_path: TEST_STORAGE,
    },
  },
} as unknown as Partial<OhMyOpenCodeConfig>

describe("task_update tool", () => {
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

  test("#given existing task #when update fields #then merges changes", async () => {
    //#given
    const taskId = "T-test-777"
    writeFileSync(
      join(TEST_DIR, `${taskId}.json`),
      JSON.stringify({
        id: taskId,
        subject: "Old subject",
        description: "",
        status: "pending",
        blocks: ["T-a"],
        blockedBy: [],
        threadID: "session-1",
      }),
      "utf-8",
    )

    //#when
    const tool = createTaskUpdateTool(TEST_CONFIG)
    const result = JSON.parse(
      await tool.execute({ id: taskId, subject: "New subject", addBlockedBy: ["T-b"] }, testContext as never),
    )

    //#then
    expect(result.task.subject).toBe("New subject")
    expect(result.task.blocks).toEqual(["T-a"])
    expect(result.task.blockedBy).toEqual(["T-b"])
  })

  test("#given missing task file #when update #then returns task_not_found", async () => {
    //#given
    const tool = createTaskUpdateTool(TEST_CONFIG)

    //#when
    const result = JSON.parse(await tool.execute({ id: "T-missing-1", subject: "Noop" }, testContext as never))

    //#then
    expect(result.error).toBe("task_not_found")
  })

  test("#given malformed task id #when update #then rejects with invalid_task_id", async () => {
    //#given
    const tool = createTaskUpdateTool(TEST_CONFIG)

    //#when
    const result = JSON.parse(await tool.execute({ id: "bad-id", subject: "Noop" }, testContext as never))

    //#then
    expect(result.error).toBe("invalid_task_id")
  })
})
