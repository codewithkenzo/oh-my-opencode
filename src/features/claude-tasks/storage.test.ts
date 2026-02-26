import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import type { OhMyOpenCodeConfig } from "../../config/schema"
import { join } from "node:path"
import { z } from "zod"
import {
  getTaskDir,
  listTaskFiles,
  readJsonSafe,
  resolveTaskListId,
  sanitizePathSegment,
  writeJsonAtomic,
} from "./storage"

const TEST_STORAGE = ".test-claude-tasks-storage"
const TEST_DIR = join(process.cwd(), TEST_STORAGE)
const TEST_CONFIG = {
  musashi_agent: {
    tasks: {
      storage_path: TEST_STORAGE,
      task_list_id: "my/list:id",
    },
  },
} as unknown as Partial<OhMyOpenCodeConfig>

describe("claude-tasks storage", () => {
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

  test("#given task data #when writing then reading #then persistence round trip succeeds", () => {
    //#given
    const taskPath = join(getTaskDir(TEST_CONFIG), "T-roundtrip.json")
    const schema = z.object({ id: z.string(), subject: z.string(), status: z.string() })

    //#when
    writeJsonAtomic(taskPath, { id: "T-roundtrip", subject: "Persist me", status: "pending" })
    const stored = readJsonSafe(taskPath, schema)

    //#then
    expect(stored).toEqual({ id: "T-roundtrip", subject: "Persist me", status: "pending" })
    expect(listTaskFiles(TEST_CONFIG)).toContain("T-roundtrip")
  })

  test("#given missing file #when reading #then null is returned", () => {
    //#given
    const missingPath = join(getTaskDir(TEST_CONFIG), "T-missing.json")
    const schema = z.object({ id: z.string() })

    //#when
    const stored = readJsonSafe(missingPath, schema)

    //#then
    expect(stored).toBeNull()
  })

  test("#given malformed JSON file #when reading #then null is returned", () => {
    //#given
    const malformedPath = join(getTaskDir(TEST_CONFIG), "T-bad.json")
    mkdirSync(getTaskDir(TEST_CONFIG), { recursive: true })
    writeFileSync(malformedPath, "{not:valid-json", "utf-8")
    const schema = z.object({ id: z.string() })

    //#when
    const stored = readJsonSafe(malformedPath, schema)

    //#then
    expect(stored).toBeNull()
  })

  test("#given task list id values #when resolving and sanitizing #then unsafe path chars are normalized", () => {
    //#when
    const listId = resolveTaskListId(TEST_CONFIG)
    const sanitized = sanitizePathSegment("with/slash:and space")

    //#then
    expect(listId).toBe("my-list-id")
    expect(sanitized).toBe("with-slash-and-space")
  })
})
