import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"

import { createTaskResumeInfoHook } from "./index"

type HookInput = { tool: string; sessionID: string; callID: string }
type HookOutput = { title: string; output: string; metadata: unknown }

const BASE_INPUT: HookInput = {
  tool: "task",
  sessionID: "ses_resume",
  callID: "call_resume",
}

describe("createTaskResumeInfoHook", () => {
  let nowSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    nowSpy = spyOn(Date, "now").mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    nowSpy.mockRestore()
  })

  test("#when target tool output contains Session ID #then appends resume instruction", async () => {
    // #given
    const hook = createTaskResumeInfoHook()
    const output: HookOutput = {
      title: "task complete",
      output: "Task done\nSession ID: ses_abc123",
      metadata: {},
    }

    // #when
    await hook["tool.execute.after"]?.(BASE_INPUT, output)

    // #then
    expect(output.output).toContain('to resume: delegate_task(resume="ses_abc123", prompt="...")')
  })

  test("#when output starts with Error #then skips resume instruction", async () => {
    // #given
    const hook = createTaskResumeInfoHook()
    const output: HookOutput = {
      title: "task failed",
      output: "Error: task execution failed\nSession ID: ses_err123",
      metadata: {},
    }

    // #when
    await hook["tool.execute.after"]?.(BASE_INPUT, output)

    // #then
    expect(output.output).not.toContain("to resume:")
  })

  test("#when resume line already exists #then does not append duplicate", async () => {
    // #given
    const hook = createTaskResumeInfoHook()
    const output: HookOutput = {
      title: "task complete",
      output:
        "Task done\nSession ID: ses_dup123\n\nto resume: delegate_task(resume=\"ses_dup123\", prompt=\"...\")",
      metadata: {},
    }

    // #when
    await hook["tool.execute.after"]?.(BASE_INPUT, output)

    // #then
    const occurrences = output.output.match(/to resume:/g)?.length ?? 0
    expect(occurrences).toBe(1)
  })

  test("#when using alternate session_id format #then extracts and appends resume instruction", async () => {
    // #given
    const hook = createTaskResumeInfoHook()
    const output: HookOutput = {
      title: "delegated",
      output: "task finished\nsession_id: ses_alt_123",
      metadata: {},
    }

    // #when
    await hook["tool.execute.after"]?.(
      { ...BASE_INPUT, tool: "delegate_task" },
      output
    )

    // #then
    expect(output.output).toContain('to resume: delegate_task(resume="ses_alt_123", prompt="...")')
  })
})
