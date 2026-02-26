import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import * as realOpencodeVersion from "./opencode-version"

const realIsOpenCodeVersionAtLeast = realOpencodeVersion.isOpenCodeVersionAtLeast

let versionOk = true
let versionCheckCalls = 0
let tempDataDir = ""
let useVersionMock = false

mock.module("./data-path", () => ({
  getDataDir: () => tempDataDir,
}))

mock.module("./opencode-version", () => ({
  ...realOpencodeVersion,
  isOpenCodeVersionAtLeast: (...args: [string]) => {
    if (!useVersionMock) return realIsOpenCodeVersionAtLeast(...args)
    versionCheckCalls += 1
    return versionOk
  },
}))

const { isSqliteBackend, resetSqliteBackendCache } = await import("./opencode-storage-detection")

function getDbPath(): string {
  return join(tempDataDir, "opencode", "opencode.db")
}

function setDatabaseExists(exists: boolean): void {
  if (exists) {
    mkdirSync(join(tempDataDir, "opencode"), { recursive: true })
    writeFileSync(getDbPath(), "")
    return
  }

  rmSync(getDbPath(), { force: true })
}

describe("opencode-storage-detection", () => {
  beforeEach(() => {
    // #given a fresh cache and default checks
    useVersionMock = true
    resetSqliteBackendCache()
    tempDataDir = mkdtempSync(join(tmpdir(), "omo-storage-detection-"))
    versionOk = true
    setDatabaseExists(true)
    versionCheckCalls = 0
  })

  afterEach(() => {
    useVersionMock = false
    rmSync(tempDataDir, { recursive: true, force: true })
    tempDataDir = ""
  })

  test("caches true result and skips repeated checks", () => {
    // #when called twice with a valid sqlite backend
    const firstResult = isSqliteBackend()
    const secondResult = isSqliteBackend()

    // #then both calls return true and checks run once
    expect(firstResult).toBe(true)
    expect(secondResult).toBe(true)
    expect(versionCheckCalls).toBe(1)
  })

  test("retries once after initial false and then caches true", () => {
    // #given first check fails because database file is missing
    setDatabaseExists(false)

    // #when called three times and file appears before second call
    const firstResult = isSqliteBackend()
    setDatabaseExists(true)
    const secondResult = isSqliteBackend()
    const thirdResult = isSqliteBackend()

    // #then second call rechecks and third call uses cached true
    expect(firstResult).toBe(false)
    expect(secondResult).toBe(true)
    expect(thirdResult).toBe(true)
    expect(versionCheckCalls).toBe(2)
  })

  test("resetSqliteBackendCache clears cached value", () => {
    // #given true result is cached
    const cachedResult = isSqliteBackend()
    expect(cachedResult).toBe(true)

    // #when dependencies change and cache is reset
    versionOk = false
    setDatabaseExists(false)
    const beforeResetResult = isSqliteBackend()
    resetSqliteBackendCache()
    const afterResetResult = isSqliteBackend()

    // #then old cached value is ignored after reset
    expect(beforeResetResult).toBe(true)
    expect(afterResetResult).toBe(false)
    expect(versionCheckCalls).toBe(2)
  })
})
