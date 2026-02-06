import { beforeEach, describe, expect, it, mock } from "bun:test"
import type { McpClientManager } from "../../features/skill-mcp-manager"
import type { LoadedRawMcpServer } from "../../features/claude-code-mcp-loader"
import { createMcpQueryTool } from "./tools"

const mockContext = {
  sessionID: "test-session",
  messageID: "msg-1",
  agent: "test-agent",
  abort: new AbortController().signal,
}

function createServer(name: string, scope: "user" | "project" | "local"): LoadedRawMcpServer {
  return {
    name,
    scope,
    config: {
      command: "node",
      args: ["server.js"],
    },
  }
}

describe("mcp_query tool", () => {
  const listTools = mock(async () => [
    { name: "query", description: "Run SQL query" },
    { name: "migrate", description: "Run migrations" },
  ])
  const listResources = mock(async () => [
    { uri: "memory://notes", description: "Stored notes" },
  ])
  const listPrompts = mock(async () => [
    { name: "summarize", description: "Summarize text" },
  ])

  const manager = {
    listTools,
    listResources,
    listPrompts,
  } as unknown as McpClientManager

  beforeEach(() => {
    listTools.mockClear()
    listResources.mockClear()
    listPrompts.mockClear()
  })

  it("returns custom MCP servers with operations", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadServers: async () => [createServer("sqlite", "project")],
    })

    // #when
    const output = await tool.execute({}, mockContext)
    const parsed = JSON.parse(output as string) as {
      returned_servers: number
      servers: Array<{ server_name: string; counts: { tools: number; resources: number; prompts: number } }>
    }

    // #then
    expect(parsed.returned_servers).toBe(1)
    expect(parsed.servers[0]?.server_name).toBe("sqlite")
    expect(parsed.servers[0]?.counts).toEqual({ tools: 2, resources: 1, prompts: 1 })
  })

  it("filters by operation query", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadServers: async () => [createServer("sqlite", "project")],
    })

    // #when
    const output = await tool.execute({ query: "migrate" }, mockContext)
    const parsed = JSON.parse(output as string) as {
      returned_servers: number
      servers: Array<{ operations: Array<{ name: string }> }>
    }

    // #then
    expect(parsed.returned_servers).toBe(1)
    expect(parsed.servers[0]?.operations).toHaveLength(1)
    expect(parsed.servers[0]?.operations[0]?.name).toBe("migrate")
  })

  it("supports metadata-only mode without operation calls", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadServers: async () => [createServer("memory", "local")],
    })

    // #when
    const output = await tool.execute({ include_operations: false }, mockContext)
    const parsed = JSON.parse(output as string) as {
      returned_servers: number
      servers: Array<{ operations: unknown[]; counts: { tools: number; resources: number; prompts: number } }>
    }

    // #then
    expect(parsed.returned_servers).toBe(1)
    expect(parsed.servers[0]?.operations).toEqual([])
    expect(parsed.servers[0]?.counts).toEqual({ tools: 0, resources: 0, prompts: 0 })
    expect(listTools).not.toHaveBeenCalled()
    expect(listResources).not.toHaveBeenCalled()
    expect(listPrompts).not.toHaveBeenCalled()
  })

  it("captures per-operation errors without failing entire response", async () => {
    // #given
    listPrompts.mockImplementationOnce(async () => {
      throw new Error("prompt API unavailable")
    })

    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadServers: async () => [createServer("memory", "local")],
    })

    // #when
    const output = await tool.execute({}, mockContext)
    const parsed = JSON.parse(output as string) as {
      servers: Array<{ errors?: string[] }>
    }

    // #then
    expect(parsed.servers[0]?.errors).toBeDefined()
    expect(parsed.servers[0]?.errors?.some((entry) => entry.includes("prompt API unavailable"))).toBe(true)
  })

  it("rejects query usage when claude_code.mcp is disabled", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      enabled: false,
      loadServers: async () => [createServer("sqlite", "project")],
    })

    // #when / #then
    await expect(tool.execute({}, mockContext)).rejects.toThrow(/claude_code\.mcp=false/)
  })
})
