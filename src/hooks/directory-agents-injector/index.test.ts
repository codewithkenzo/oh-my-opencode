import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import * as fs from "node:fs"

import * as dynamicTruncator from "../../shared/dynamic-truncator"
import * as storage from "./storage"
import { createDirectoryAgentsInjectorHook } from "./index"

type HookInput = { tool: string; sessionID: string; callID: string }
type BeforeOutput = { args: unknown }
type AfterOutput = { title: string; output: string; metadata: unknown }

const BASE_INPUT: HookInput = {
  tool: "read",
  sessionID: "ses_agents",
  callID: "call_agents",
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

describe("createDirectoryAgentsInjectorHook", () => {
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

  test("#when read tool runs #then injects AGENTS.md files from parent directories except root", async () => {
    // #given
    const existsSyncSpy = spyOn(fs, "existsSync").mockImplementation((pathLike) => {
      const path = String(pathLike)
      return path === "/repo/src/AGENTS.md" || path === "/repo/src/lib/AGENTS.md" || path === "/repo/AGENTS.md"
    })
    const readFileSyncSpy = spyOn(fs, "readFileSync").mockReturnValue("AGENTS CONTENT" as never)
    const hook = createDirectoryAgentsInjectorHook(createCtx() as never)
    const output: AfterOutput = {
      title: "/repo/src/lib/file.ts",
      output: "read result",
      metadata: {},
    }

    // #when
    await hook["tool.execute.after"]?.(BASE_INPUT, output)

    // #then
    expect(output.output).toContain("[Directory Context: /repo/src/AGENTS.md]")
    expect(output.output).toContain("AGENTS CONTENT")
    expect(output.output).toContain("[Directory Context: /repo/src/lib/AGENTS.md]")
    expect(output.output).toContain("AGENTS CONTENT")
    expect(output.output).not.toContain("[Directory Context: /repo/AGENTS.md]")

    existsSyncSpy.mockRestore()
    readFileSyncSpy.mockRestore()
  })

  test("#when same session reads same directory twice #then injects only once due to session cache", async () => {
    // #given
    const existsSyncSpy = spyOn(fs, "existsSync").mockImplementation((pathLike) => String(pathLike) === "/repo/src/AGENTS.md")
    const readFileSyncSpy = spyOn(fs, "readFileSync").mockReturnValue("SRC AGENTS" as never)
    const hook = createDirectoryAgentsInjectorHook(createCtx() as never)
    const output1: AfterOutput = { title: "/repo/src/a.ts", output: "first", metadata: {} }
    const output2: AfterOutput = { title: "/repo/src/b.ts", output: "second", metadata: {} }

    // #when
    await hook["tool.execute.after"]?.(BASE_INPUT, output1)
    await hook["tool.execute.after"]?.(
      { ...BASE_INPUT, callID: "call_agents_2" },
      output2
    )

    // #then
    expect(output1.output).toContain("SRC AGENTS")
    expect(output2.output).not.toContain("SRC AGENTS")
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1)

    existsSyncSpy.mockRestore()
    readFileSyncSpy.mockRestore()
  })

  test("#when batch contains read calls #then processes queued paths on batch after", async () => {
    // #given
    const existsSyncSpy = spyOn(fs, "existsSync").mockImplementation((pathLike) => String(pathLike) === "/repo/pkg/AGENTS.md")
    const readFileSyncSpy = spyOn(fs, "readFileSync").mockReturnValue("PKG AGENTS" as never)
    const hook = createDirectoryAgentsInjectorHook(createCtx() as never)
    const beforeOutput: BeforeOutput = {
      args: {
        tool_calls: [
          { tool: "read", parameters: { filePath: "/repo/pkg/file-a.ts" } },
          { tool: "glob", parameters: { pattern: "**/*.ts" } },
        ],
      },
    }
    const afterOutput: AfterOutput = { title: "batch", output: "batch result", metadata: {} }

    // #when
    await hook["tool.execute.before"]?.(
      { ...BASE_INPUT, tool: "batch", callID: "call_batch_1" },
      beforeOutput
    )
    await hook["tool.execute.after"]?.(
      { ...BASE_INPUT, tool: "batch", callID: "call_batch_1" },
      afterOutput
    )

    // #then
    expect(afterOutput.output).toContain("[Directory Context: /repo/pkg/AGENTS.md]")
    expect(afterOutput.output).toContain("PKG AGENTS")

    existsSyncSpy.mockRestore()
    readFileSyncSpy.mockRestore()
  })

  test("#when session is compacted #then clears persisted session cache", async () => {
    // #given
    const existsSyncSpy = spyOn(fs, "existsSync").mockImplementation((pathLike) => String(pathLike) === "/repo/src/AGENTS.md")
    const readFileSyncSpy = spyOn(fs, "readFileSync").mockReturnValue("SRC AGENTS" as never)
    const clearSpy = spyOn(storage, "clearInjectedPaths").mockImplementation(() => {})
    spies.push(clearSpy)
    const hook = createDirectoryAgentsInjectorHook(createCtx() as never)
    const first: AfterOutput = { title: "/repo/src/one.ts", output: "first", metadata: {} }
    const second: AfterOutput = { title: "/repo/src/two.ts", output: "second", metadata: {} }

    // #when
    await hook["tool.execute.after"]?.(BASE_INPUT, first)
    await hook.event?.({ event: { type: "session.compacted", properties: { sessionID: "ses_agents" } } })
    await hook["tool.execute.after"]?.(
      { ...BASE_INPUT, callID: "call_agents_3" },
      second
    )

    // #then
    expect(second.output).toBe("second")
    expect(clearSpy).toHaveBeenCalledWith("ses_agents")

    existsSyncSpy.mockRestore()
    readFileSyncSpy.mockRestore()
  })
})
