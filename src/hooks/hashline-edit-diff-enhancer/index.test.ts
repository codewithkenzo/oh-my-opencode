import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"

import { createHashlineEditDiffEnhancerHook } from "./index"

type BeforeInput = { tool: string; sessionID: string; callID: string }
type BeforeOutput = { args: Record<string, unknown> }
type AfterOutput = { title: string; output: string; metadata: Record<string, unknown> }

describe("createHashlineEditDiffEnhancerHook", () => {
  let bunFileSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    bunFileSpy = spyOn(Bun, "file")
  })

  afterEach(() => {
    bunFileSpy.mockRestore()
  })

  test("#when write runs with file path #then captures before/after and writes diff metadata", async () => {
    // #given
    const hook = createHashlineEditDiffEnhancerHook({ hashline_edit: { enabled: true } })
    const filePath = "/tmp/example.ts"
    let readCount = 0
    bunFileSpy.mockImplementation(() => {
      return {
        exists: async () => true,
        text: async () => {
          readCount += 1
          if (readCount === 1) return "const a = 1\nconst b = 2\n"
          return "const a = 1\nconst b = 3\n"
        },
      } as never
    })

    const beforeInput: BeforeInput = { tool: "write", sessionID: "ses_diff_1", callID: "call_diff_1" }
    const beforeOutput: BeforeOutput = { args: { path: filePath } }
    const afterOutput: AfterOutput = { title: "write", output: "ok", metadata: {} }

    // #when
    await hook["tool.execute.before"]?.(beforeInput, beforeOutput)
    await hook["tool.execute.after"]?.(beforeInput, afterOutput)

    // #then
    expect(afterOutput.title).toBe(filePath)
    expect(afterOutput.metadata.filediff).toEqual({
      file: filePath,
      path: filePath,
      before: "const a = 1\nconst b = 2\n",
      after: "const a = 1\nconst b = 3\n",
      additions: 1,
      deletions: 1,
    })
    expect(String(afterOutput.metadata.diff)).toContain(`--- ${filePath}`)
    expect(String(afterOutput.metadata.diff)).toContain(`+++ ${filePath}`)
  })

  test("#when tool is not write #then skips capture and enhancement", async () => {
    // #given
    const hook = createHashlineEditDiffEnhancerHook({ hashline_edit: { enabled: true } })
    const input: BeforeInput = { tool: "read", sessionID: "ses_diff_2", callID: "call_diff_2" }
    const beforeOutput: BeforeOutput = { args: { path: "/tmp/ignored.ts" } }
    const afterOutput: AfterOutput = { title: "read", output: "ok", metadata: {} }

    // #when
    await hook["tool.execute.before"]?.(input, beforeOutput)
    await hook["tool.execute.after"]?.(input, afterOutput)

    // #then
    expect(bunFileSpy).not.toHaveBeenCalled()
    expect(afterOutput.metadata.diff).toBeUndefined()
  })

  test("#when write args omit file path #then no pending capture is stored", async () => {
    // #given
    const hook = createHashlineEditDiffEnhancerHook({ hashline_edit: { enabled: true } })
    const input: BeforeInput = { tool: "write", sessionID: "ses_diff_3", callID: "call_diff_3" }
    const beforeOutput: BeforeOutput = { args: {} }
    const afterOutput: AfterOutput = { title: "write", output: "ok", metadata: {} }

    // #when
    await hook["tool.execute.before"]?.(input, beforeOutput)
    await hook["tool.execute.after"]?.(input, afterOutput)

    // #then
    expect(bunFileSpy).not.toHaveBeenCalled()
    expect(afterOutput.metadata.filediff).toBeUndefined()
  })

  test("#when enhancer is disabled #then no Bun.file access occurs", async () => {
    // #given
    const hook = createHashlineEditDiffEnhancerHook({ hashline_edit: { enabled: false } })
    const input: BeforeInput = { tool: "write", sessionID: "ses_diff_4", callID: "call_diff_4" }
    const beforeOutput: BeforeOutput = { args: { filePath: "/tmp/disabled.ts" } }
    const afterOutput: AfterOutput = { title: "write", output: "ok", metadata: {} }

    // #when
    await hook["tool.execute.before"]?.(input, beforeOutput)
    await hook["tool.execute.after"]?.(input, afterOutput)

    // #then
    expect(bunFileSpy).not.toHaveBeenCalled()
    expect(afterOutput.metadata.diff).toBeUndefined()
  })
})
