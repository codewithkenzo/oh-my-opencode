import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import * as fs from "node:fs"

import * as dynamicTruncator from "../../shared/dynamic-truncator"
import * as storage from "./storage"
import { createDirectoryReadmeInjectorHook } from "./index"

type HookInput = { tool: string; sessionID: string; callID: string }
type BeforeOutput = { args: unknown }
type AfterOutput = { title: string; output: string; metadata: unknown }

const BASE_INPUT: HookInput = {
  tool: "read",
  sessionID: "ses_readme",
  callID: "call_readme",
}

function createCtx() {
  return {
    directory: "/repo",
    client: {
      session: {
        messages: async () => ({ data: [] }),
      },
    },
  }
}

describe("createDirectoryReadmeInjectorHook", () => {
  const spies: Array<{ mockRestore: () => void }> = []

  beforeEach(() => {
    const truncatorSpy = spyOn(dynamicTruncator, "createDynamicTruncator").mockReturnValue({
      truncate: async (_sessionID: string, content: string) => ({ result: content, truncated: false }),
      getUsage: async () => null,
      truncateSync: (output: string) => ({ result: output, truncated: false }),
    })
    const loadSpy = spyOn(storage, "loadInjectedPaths").mockReturnValue(new Set())
    const saveSpy = spyOn(storage, "saveInjectedPaths").mockImplementation(() => {})
    const clearSpy = spyOn(storage, "clearInjectedPaths").mockImplementation(() => {})
    spies.push(truncatorSpy, loadSpy, saveSpy, clearSpy)
  })

  afterEach(() => {
    while (spies.length > 0) {
      const spy = spies.pop()
      spy?.mockRestore()
    }
  })

  test("#when read tool runs #then injects README.md from root to leaf order", async () => {
    // #given
    const existsSyncSpy = spyOn(fs, "existsSync").mockImplementation((pathLike) => {
      const path = String(pathLike)
      return path === "/repo/README.md" || path === "/repo/src/README.md"
    })
    const readFileSyncSpy = spyOn(fs, "readFileSync")
    readFileSyncSpy.mockImplementation((pathLike) => {
      const path = String(pathLike)
      if (path === "/repo/README.md") return "ROOT README" as never
      return "SRC README" as never
    })
    const hook = createDirectoryReadmeInjectorHook(createCtx() as never)
    const output: AfterOutput = { title: "/repo/src/file.ts", output: "read", metadata: {} }

    // #when
    await hook["tool.execute.after"]?.(BASE_INPUT, output)

    // #then
    const rootIndex = output.output.indexOf("[Project README: /repo/README.md]")
    const srcIndex = output.output.indexOf("[Project README: /repo/src/README.md]")
    expect(rootIndex).toBeGreaterThan(-1)
    expect(srcIndex).toBeGreaterThan(rootIndex)
    expect(output.output).toContain("ROOT README")
    expect(output.output).toContain("SRC README")

    existsSyncSpy.mockRestore()
    readFileSyncSpy.mockRestore()
  })

  test("#when read repeats in same session #then cached README directories are not reinjected", async () => {
    // #given
    const existsSyncSpy = spyOn(fs, "existsSync").mockImplementation((pathLike) => String(pathLike) === "/repo/README.md")
    const readFileSyncSpy = spyOn(fs, "readFileSync").mockReturnValue("ROOT README" as never)
    const hook = createDirectoryReadmeInjectorHook(createCtx() as never)
    const first: AfterOutput = { title: "/repo/a.ts", output: "first", metadata: {} }
    const second: AfterOutput = { title: "/repo/b.ts", output: "second", metadata: {} }

    // #when
    await hook["tool.execute.after"]?.(BASE_INPUT, first)
    await hook["tool.execute.after"]?.(
      { ...BASE_INPUT, callID: "call_readme_2" },
      second
    )

    // #then
    expect(first.output).toContain("ROOT README")
    expect(second.output).not.toContain("ROOT README")
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1)

    existsSyncSpy.mockRestore()
    readFileSyncSpy.mockRestore()
  })

  test("#when batch queues read paths #then injects README during batch after", async () => {
    // #given
    const existsSyncSpy = spyOn(fs, "existsSync").mockImplementation((pathLike) => String(pathLike) === "/repo/pkg/README.md")
    const readFileSyncSpy = spyOn(fs, "readFileSync").mockReturnValue("PKG README" as never)
    const hook = createDirectoryReadmeInjectorHook(createCtx() as never)
    const beforeOutput: BeforeOutput = {
      args: {
        tool_calls: [
          { tool: "read", parameters: { filePath: "/repo/pkg/file.ts" } },
          { tool: "glob", parameters: { pattern: "**/*.ts" } },
        ],
      },
    }
    const afterOutput: AfterOutput = { title: "batch", output: "batch", metadata: {} }

    // #when
    await hook["tool.execute.before"]?.(
      { ...BASE_INPUT, tool: "batch", callID: "call_readme_batch" },
      beforeOutput
    )
    await hook["tool.execute.after"]?.(
      { ...BASE_INPUT, tool: "batch", callID: "call_readme_batch" },
      afterOutput
    )

    // #then
    expect(afterOutput.output).toContain("[Project README: /repo/pkg/README.md]")
    expect(afterOutput.output).toContain("PKG README")

    existsSyncSpy.mockRestore()
    readFileSyncSpy.mockRestore()
  })

  test("#when session is deleted #then clears storage state", async () => {
    // #given
    const clearSpy = spyOn(storage, "clearInjectedPaths").mockImplementation(() => {})
    spies.push(clearSpy)
    const hook = createDirectoryReadmeInjectorHook(createCtx() as never)

    // #when
    await hook.event?.({
      event: { type: "session.deleted", properties: { info: { id: "ses_readme" } } },
    })

    // #then
    expect(clearSpy).toHaveBeenCalledWith("ses_readme")
  })
})
