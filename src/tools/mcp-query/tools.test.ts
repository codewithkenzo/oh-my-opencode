import { beforeEach, describe, expect, it, mock } from "bun:test"
import type { McpClientManager } from "../../features/skill-mcp-manager"
import { createMcpRegistry, type McpRegistryResult } from "../../features/mcp-registry"
import { createMcpQueryTool } from "./tools"

const mockContext = {
  sessionID: "test-session",
  messageID: "msg-1",
  agent: "test-agent",
  directory: "/tmp/test",
  worktree: "/tmp/test",
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
}

function createRegistry(): McpRegistryResult {
  return createMcpRegistry({
    customServers: [
      {
        name: "sqlite",
        scope: "project",
        config: {
          command: "node",
          args: ["sqlite-server.js"],
        },
      },
      {
        name: "memory",
        scope: "local",
        config: {
          command: "node",
          args: ["memory-server.js"],
        },
      },
    ],
    builtinServers: {
      context7: {
        type: "remote",
        url: "https://mcp.context7.com/mcp",
        enabled: true,
      },
    },
  })
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

  it("returns custom MCP servers with operations and source metadata", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadRegistry: async () => createRegistry(),
    })

    // #when
    const output = await tool.execute({}, mockContext)
    const parsed = JSON.parse(output as string) as {
      source: string
      returned_servers: number
      servers: Array<{
        server_name: string
        source: string
        scope: string
        precedence: number
        counts: { tools: number; resources: number; prompts: number }
      }>
    }

    // #then
    expect(parsed.source).toBe("custom")
    expect(parsed.returned_servers).toBe(2)
    expect(parsed.servers[0]?.source).toBe("custom")
    expect(parsed.servers[0]?.precedence).toBeGreaterThan(0)
    expect(parsed.servers[0]?.counts).toEqual({ tools: 2, resources: 1, prompts: 1 })
  })

  it("filters by operation query", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadRegistry: async () => createRegistry(),
    })

    // #when
    const output = await tool.execute({ query: "migrate" }, mockContext)
    const parsed = JSON.parse(output as string) as {
      total_servers: number
      candidate_servers: number
      servers: Array<{ operations: Array<{ name: string }> }>
    }

    // #then
    expect(parsed.total_servers).toBe(2)
    expect(parsed.candidate_servers).toBe(2)
    expect(parsed.servers[0]?.operations).toHaveLength(1)
    expect(parsed.servers[0]?.operations[0]?.name).toBe("migrate")
  })

  it("reports total_servers after query filtering and candidate_servers before query filtering", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadRegistry: async () => createRegistry(),
    })

    // #when
    const output = await tool.execute({ query: "sqlite", include_operations: false }, mockContext)
    const parsed = JSON.parse(output as string) as {
      total_servers: number
      candidate_servers: number
      returned_servers: number
      servers: Array<{ server_name: string }>
    }

    // #then
    expect(parsed.candidate_servers).toBe(2)
    expect(parsed.total_servers).toBe(1)
    expect(parsed.returned_servers).toBe(1)
    expect(parsed.servers[0]?.server_name).toBe("sqlite")
  })

  it("supports metadata-only mode without operation calls", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadRegistry: async () => createRegistry(),
    })

    // #when
    const output = await tool.execute({ include_operations: false }, mockContext)
    const parsed = JSON.parse(output as string) as {
      servers: Array<{ operations: unknown[]; counts: { tools: number; resources: number; prompts: number } }>
    }

    // #then
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
      loadRegistry: async () => createRegistry(),
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

  it("supports source filtering for built-in MCP servers", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadRegistry: async () => createRegistry(),
    })

    // #when
    const output = await tool.execute({ source: "builtin", include_operations: false }, mockContext)
    const parsed = JSON.parse(output as string) as {
      source: string
      returned_servers: number
      servers: Array<{ source: string; server_name: string }>
    }

    // #then
    expect(parsed.source).toBe("builtin")
    expect(parsed.returned_servers).toBe(1)
    expect(parsed.servers[0]?.source).toBe("builtin")
    expect(parsed.servers[0]?.server_name).toBe("context7")
  })

  it("honors explicit stdio type over url in transport labeling", async () => {
    // #given
    const registry = createMcpRegistry({
      customServers: [
        {
          name: "hybrid",
          scope: "project",
          config: {
            type: "stdio",
            command: "node",
            args: ["server.js"],
            url: "https://example.com/mcp",
          },
        },
      ],
    })

    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      loadRegistry: async () => registry,
    })

    // #when
    const output = await tool.execute({ include_operations: false }, mockContext)
    const parsed = JSON.parse(output as string) as {
      servers: Array<{ transport: string }>
    }

    // #then
    expect(parsed.servers[0]?.transport).toBe("stdio")
  })

  it("rejects default custom-source query when custom MCP is disabled", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      includeCustomMcp: false,
      loadRegistry: async () => createRegistry(),
    })

    // #when / #then
    await expect(tool.execute({}, mockContext)).rejects.toThrow(/claude_code\.mcp=false/)
  })

  it("loads plugin MCP servers through loadPluginMcpServers callback", async () => {
    // #given
    const tool = createMcpQueryTool({
      manager,
      getSessionID: () => "session-1",
      includeCustomMcp: false,
      loadPluginMcpServers: async () => ({
        "plugin:exa": {
          type: "remote",
          url: "https://mcp.exa.ai/mcp",
        },
      }),
    })

    // #when
    const output = await tool.execute({ source: "plugin", include_operations: false }, mockContext)
    const parsed = JSON.parse(output as string) as {
      total_servers: number
      servers: Array<{ server_name: string; source: string }>
    }

    // #then
    expect(parsed.total_servers).toBe(1)
    expect(parsed.servers[0]?.server_name).toBe("plugin:exa")
    expect(parsed.servers[0]?.source).toBe("plugin")
  })
})
