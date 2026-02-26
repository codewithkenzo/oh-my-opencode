import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"

import * as extractModule from "./extract"
import { createMemoryPersistenceHook } from "./index"
import * as persistModule from "./persist"
import * as recallModule from "./recall"
import * as supermemoryClient from "../../tools/supermemory/client"

function createCtx() {
  return {
    directory: "/repo",
    client: {},
  }
}

describe("createMemoryPersistenceHook", () => {
  const spies: Array<{ mockRestore: () => void }> = []

  beforeEach(() => {
    const isConfiguredSpy = spyOn(supermemoryClient, "isConfigured").mockReturnValue(true)
    spies.push(isConfiguredSpy)
  })

  afterEach(() => {
    while (spies.length > 0) {
      const spy = spies.pop()
      spy?.mockRestore()
    }
  })

  test("#when root session is created #then recalls and injects memories once", async () => {
    // #given
    const recallSpy = spyOn(recallModule, "recallMemories").mockResolvedValue({
      memories: [{ id: "mem_1", content: "remember this", type: "session-context", similarity: 0.9 }],
      formattedContext: "<recalled-memories />",
      timing: 12,
    })
    spies.push(recallSpy)
    const hook = createMemoryPersistenceHook(createCtx() as never)

    // #when
    await hook.event({ event: { type: "session.created", properties: { info: { id: "ses_mem_1" } } } })
    await hook.event({ event: { type: "session.created", properties: { info: { id: "ses_mem_1" } } } })

    // #then
    expect(recallSpy).toHaveBeenCalledTimes(1)
    expect(recallSpy).toHaveBeenCalledWith(
      "ses_mem_1",
      "/repo",
      expect.objectContaining({ recall_on_start: true })
    )
  })

  test("#when child session is created #then skips recall", async () => {
    // #given
    const recallSpy = spyOn(recallModule, "recallMemories").mockResolvedValue({
      memories: [],
      formattedContext: "",
      timing: 0,
    })
    spies.push(recallSpy)
    const hook = createMemoryPersistenceHook(createCtx() as never)

    // #when
    await hook.event({
      event: {
        type: "session.created",
        properties: { info: { id: "ses_child", parentID: "ses_parent" } },
      },
    })

    // #then
    expect(recallSpy).not.toHaveBeenCalled()
  })

  test("#when session reaches idle with enough deduped messages #then extracts patterns", async () => {
    // #given
    const extractSpy = spyOn(extractModule, "extractPatterns").mockResolvedValue({
      patterns: [],
      storedCount: 0,
      skippedCount: 0,
    })
    spies.push(extractSpy)
    const hook = createMemoryPersistenceHook(createCtx() as never, {
      config: { min_session_length: 2 },
    })

    // #when
    await hook.event({
      event: {
        type: "message.updated",
        properties: { info: { id: "msg_1", sessionID: "ses_mem_2", role: "user", content: "first" } },
      },
    })
    await hook.event({
      event: {
        type: "message.updated",
        properties: { info: { id: "msg_1", sessionID: "ses_mem_2", role: "user", content: "first updated" } },
      },
    })
    await hook.event({
      event: {
        type: "message.updated",
        properties: { info: { id: "msg_2", sessionID: "ses_mem_2", role: "assistant", content: "second" } },
      },
    })
    await hook.event({
      event: {
        type: "session.idle",
        properties: { sessionID: "ses_mem_2" },
      },
    })

    // #then
    expect(extractSpy).toHaveBeenCalledTimes(1)
    expect(extractSpy).toHaveBeenCalledWith(
      "ses_mem_2",
      "/repo",
      expect.objectContaining({ min_session_length: 2 }),
      [
        { role: "user", content: "first updated" },
        { role: "assistant", content: "second" },
      ]
    )
  })

  test("#when summarize runs with persistence enabled #then persists session state", async () => {
    // #given
    const persistSpy = spyOn(persistModule, "persistSessionState").mockResolvedValue(true)
    spies.push(persistSpy)
    const hook = createMemoryPersistenceHook(createCtx() as never)

    // #when
    await hook.onSummarize?.({
      sessionID: "ses_mem_3",
      directory: "/repo",
      summary: "- Decision: use zod\n- Next: add tests",
    })

    // #then
    expect(persistSpy).toHaveBeenCalledWith(
      "ses_mem_3",
      "/repo",
      expect.any(Object),
      "- Decision: use zod\n- Next: add tests"
    )
  })

  test("#when session is deleted #then internal state is cleared and session can be recalled again", async () => {
    // #given
    const recallSpy = spyOn(recallModule, "recallMemories").mockResolvedValue({
      memories: [],
      formattedContext: "",
      timing: 0,
    })
    spies.push(recallSpy)
    const hook = createMemoryPersistenceHook(createCtx() as never)

    // #when
    await hook.event({ event: { type: "session.created", properties: { info: { id: "ses_mem_4" } } } })
    await hook.event({ event: { type: "session.deleted", properties: { info: { id: "ses_mem_4" } } } })
    await hook.event({ event: { type: "session.created", properties: { info: { id: "ses_mem_4" } } } })

    // #then
    expect(recallSpy).toHaveBeenCalledTimes(2)
  })
})
