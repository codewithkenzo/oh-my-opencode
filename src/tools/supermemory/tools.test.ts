import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"
import * as client from "./client"
import { createSupermemoryTool } from "./tools"

describe("supermemory tool", () => {
  const restores: Array<() => void> = []

  beforeEach(() => {
    const tagsSpy = spyOn(client, "getTags").mockReturnValue({
      user: "tag:user",
      project: "tag:project",
    })
    restores.push(() => tagsSpy.mockRestore())
  })

  afterEach(() => {
    for (const restore of restores.splice(0)) restore()
  })

  it("#given missing api key #when execute runs #then returns configuration error json", async () => {
    // #given
    const configuredSpy = spyOn(client, "isConfigured").mockReturnValue(false)
    restores.push(() => configuredSpy.mockRestore())
    const tool = createSupermemoryTool("/repo")

    // #when
    const output = await tool.execute({ mode: "search", query: "abc" }, {} as never)
    const parsed = JSON.parse(output as string) as { success: boolean; error: string }

    // #then
    expect(parsed.success).toBe(false)
    expect(parsed.error).toContain("SUPERMEMORY_API_KEY")
  })

  it("#given private content #when add mode executes #then blocks storing fully private data", async () => {
    // #given
    const configuredSpy = spyOn(client, "isConfigured").mockReturnValue(true)
    const fullyPrivateSpy = spyOn(client, "isFullyPrivate").mockReturnValue(true)
    const stripSpy = spyOn(client, "stripPrivateContent").mockReturnValue("[REDACTED]")
    restores.push(() => configuredSpy.mockRestore(), () => fullyPrivateSpy.mockRestore(), () => stripSpy.mockRestore())
    const tool = createSupermemoryTool("/repo")

    // #when
    const output = await tool.execute({ mode: "add", content: "<private>secret</private>" }, {} as never)
    const parsed = JSON.parse(output as string) as { success: boolean; error: string }

    // #then
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe("Cannot store fully private content")
  })

  it("#given user and project search results #when search runs without scope #then merges and sorts by similarity", async () => {
    // #given
    const configuredSpy = spyOn(client, "isConfigured").mockReturnValue(true)
    const searchSpy = spyOn(client.supermemoryClient, "searchMemories")
      .mockResolvedValueOnce({
        results: [{ id: "u-1", memory: "user memory", similarity: 0.5 }],
      } as never)
      .mockResolvedValueOnce({
        results: [{ id: "p-1", memory: "project memory", similarity: 0.9 }],
      } as never)
    restores.push(() => configuredSpy.mockRestore(), () => searchSpy.mockRestore())
    const tool = createSupermemoryTool("/repo")

    // #when
    const output = await tool.execute({ mode: "search", query: "memory", limit: 5 }, {} as never)
    const parsed = JSON.parse(output as string) as {
      success: boolean
      results: Array<{ id: string; content: string; similarity: number; scope: string }>
    }

    // #then
    expect(parsed.success).toBe(true)
    expect(parsed.results).toHaveLength(2)
    expect(parsed.results[0]).toEqual({ id: "p-1", content: "project memory", similarity: 90, scope: "project" })
    expect(parsed.results[1]).toEqual({ id: "u-1", content: "user memory", similarity: 50, scope: "user" })
  })
})
