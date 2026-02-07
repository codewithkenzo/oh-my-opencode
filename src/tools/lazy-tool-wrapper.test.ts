import { describe, it, expect, mock } from "bun:test"
import type { ToolDefinition } from "@opencode-ai/plugin"
import { createLazyTool } from "./lazy-tool-wrapper"

const mockToolArgs = {
  input: { type: "string", description: "test input" },
} as unknown as ToolDefinition["args"]

const mockArgs: Parameters<ToolDefinition["execute"]>[0] = { input: "test" }
const mockContext: Parameters<ToolDefinition["execute"]>[1] = {
  sessionID: "test-session",
  messageID: "msg-1",
  agent: "test-agent",
  abort: new AbortController().signal,
}

describe("createLazyTool", () => {
  it("returns description and args immediately without loading", () => {
    // #given
    const mockTool: ToolDefinition = {
      description: "mock tool",
      args: mockToolArgs,
      execute: async () => "mock result",
    } as ToolDefinition
    const loader = mock(async () => mockTool)

    // #when
    const tool = createLazyTool({
      name: "lazy_mock",
      description: "lazy description",
      args: mockToolArgs,
      loader,
    })

    // #then
    expect(tool.description).toBe("lazy description")
    expect(tool.args).toBe(mockToolArgs)
    expect(loader).not.toHaveBeenCalled()
  })

  it("does not call loader until execute is invoked", async () => {
    // #given
    const mockTool: ToolDefinition = {
      description: "mock tool",
      args: mockToolArgs,
      execute: async () => "mock result",
    } as ToolDefinition
    const loader = mock(async () => mockTool)
    const tool = createLazyTool({
      name: "lazy_mock",
      description: "lazy description",
      args: mockToolArgs,
      loader,
    })

    // #when
    expect(loader).not.toHaveBeenCalled()
    const result = await tool.execute(mockArgs, mockContext)

    // #then
    expect(loader).toHaveBeenCalledTimes(1)
    expect(result).toBe("mock result")
  })

  it("caches loaded tool and reuses it on subsequent execute calls", async () => {
    // #given
    const execute = mock(async () => "mock result")
    const mockTool: ToolDefinition = {
      description: "mock tool",
      args: mockToolArgs,
      execute,
    } as ToolDefinition
    const loader = mock(async () => mockTool)
    const tool = createLazyTool({
      name: "lazy_mock",
      description: "lazy description",
      args: mockToolArgs,
      loader,
    })

    // #when
    const first = await tool.execute(mockArgs, mockContext)
    const second = await tool.execute(mockArgs, mockContext)

    // #then
    expect(first).toBe("mock result")
    expect(second).toBe("mock result")
    expect(loader).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it("deduplicates concurrent first execute calls with a single loader invocation", async () => {
    // #given
    const execute = mock(async () => "mock result")
    const mockTool: ToolDefinition = {
      description: "mock tool",
      args: mockToolArgs,
      execute,
    } as ToolDefinition

    let resolveLoad: (tool: ToolDefinition) => void = () => {}
    const loader = mock(
      () =>
        new Promise<ToolDefinition>((resolve) => {
          resolveLoad = resolve
        }),
    )

    const tool = createLazyTool({
      name: "lazy_mock",
      description: "lazy description",
      args: mockToolArgs,
      loader,
    })

    // #when
    const firstCall = tool.execute(mockArgs, mockContext)
    const secondCall = tool.execute(mockArgs, mockContext)
    expect(loader).toHaveBeenCalledTimes(1)

    resolveLoad(mockTool)
    const [first, second] = await Promise.all([firstCall, secondCall])

    // #then
    expect(first).toBe("mock result")
    expect(second).toBe("mock result")
    expect(loader).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it("calls onFirstLoad once with tool name and positive load time", async () => {
    // #given
    const mockTool: ToolDefinition = {
      description: "mock tool",
      args: mockToolArgs,
      execute: async () => "mock result",
    } as ToolDefinition
    const loader = mock(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      return mockTool
    })
    const onFirstLoad = mock<(name: string, loadTimeMs: number) => void>(() => {})
    const tool = createLazyTool({
      name: "lazy_mock",
      description: "lazy description",
      args: mockToolArgs,
      loader,
      onFirstLoad,
    })

    // #when
    await tool.execute(mockArgs, mockContext)

    // #then
    expect(onFirstLoad).toHaveBeenCalledTimes(1)
    const [name, loadTimeMs] = onFirstLoad.mock.calls[0] ?? []
    expect(name).toBe("lazy_mock")
    expect(typeof loadTimeMs).toBe("number")
    expect(loadTimeMs).toBeGreaterThan(0)
  })

  it("does not call onFirstLoad on subsequent execute calls after caching", async () => {
    // #given
    const mockTool: ToolDefinition = {
      description: "mock tool",
      args: mockToolArgs,
      execute: async () => "mock result",
    } as ToolDefinition
    const loader = mock(async () => mockTool)
    const onFirstLoad = mock<(name: string, loadTimeMs: number) => void>(() => {})
    const tool = createLazyTool({
      name: "lazy_mock",
      description: "lazy description",
      args: mockToolArgs,
      loader,
      onFirstLoad,
    })

    // #when
    await tool.execute(mockArgs, mockContext)
    await tool.execute(mockArgs, mockContext)

    // #then
    expect(loader).toHaveBeenCalledTimes(1)
    expect(onFirstLoad).toHaveBeenCalledTimes(1)
  })

  it("recovers from loader rejection and allows retry", async () => {
    // #given
    let callCount = 0
    const mockTool: ToolDefinition = {
      description: "mock tool",
      args: mockToolArgs,
      execute: async () => "recovered result",
    } as ToolDefinition
    const loader = mock(async () => {
      callCount++
      if (callCount === 1) {
        throw new Error("transient failure")
      }
      return mockTool
    })
    const tool = createLazyTool({
      name: "lazy_mock",
      description: "lazy description",
      args: mockToolArgs,
      loader,
    })

    // #when: first call fails
    let error: Error | undefined
    try {
      await tool.execute(mockArgs, mockContext)
    } catch (err) {
      error = err as Error
    }

    // #then: error surfaced
    expect(error?.message).toBe("transient failure")

    // #when: retry succeeds because loading was cleared
    const result = await tool.execute(mockArgs, mockContext)

    // #then
    expect(result).toBe("recovered result")
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
