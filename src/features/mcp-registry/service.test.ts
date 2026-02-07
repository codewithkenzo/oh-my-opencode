import { describe, expect, test } from "bun:test"
import { createMcpRegistry, filterMcpRegistryServers } from "./service"

describe("createMcpRegistry", () => {
  test("applies source precedence and records collisions", () => {
    // #given
    const registry = createMcpRegistry({
      builtinServers: {
        sqlite: {
          type: "remote",
          url: "https://builtin.example/sqlite",
          enabled: true,
        },
      },
      customServers: [
        {
          name: "sqlite",
          scope: "project",
          config: {
            type: "stdio",
            command: "node",
            args: ["sqlite-server.js"],
          },
        },
      ],
      pluginServers: {
        sqlite: {
          type: "remote",
          url: "https://plugin.example/sqlite",
        },
      },
    })

    // #then
    expect(registry.effectiveServersByName.sqlite?.source).toBe("plugin")
    expect(registry.collisions).toHaveLength(1)
    expect(registry.collisions[0]?.name).toBe("sqlite")
    expect(registry.collisions[0]?.overridden.map((entry) => entry.source)).toEqual([
      "custom",
      "builtin",
    ])
  })

  test("includes skill MCP servers with skill context", () => {
    // #given
    const registry = createMcpRegistry({
      skills: [
        {
          name: "playwright",
          definition: {} as never,
          scope: "builtin",
          mcpConfig: {
            browser: {
              command: "npx",
              args: ["@playwright/mcp"],
            },
          },
        },
      ],
    })

    // #then
    expect(registry.effectiveServersByName.browser?.source).toBe("skill")
    expect(registry.effectiveServersByName.browser?.contextName).toBe("playwright")
    expect(registry.effectiveServersByName.browser?.transport).toBe("stdio")
  })

  test("converts plugin local config into stdio-style config", () => {
    // #given
    const registry = createMcpRegistry({
      pluginServers: {
        "plugin:sqlite": {
          type: "local",
          command: ["node", "server.js"],
          environment: {
            NODE_ENV: "test",
          },
        },
      },
    })

    // #then
    const server = registry.effectiveServersByName["plugin:sqlite"]
    expect(server?.source).toBe("plugin")
    expect(server?.transport).toBe("stdio")
    expect(server?.config.command).toBe("node")
    expect(server?.config.args).toEqual(["server.js"])
    expect(server?.config.env).toEqual({ NODE_ENV: "test" })
  })

  test("infers stdio transport when explicit stdio type exists with url", () => {
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

    // #then
    expect(registry.effectiveServersByName.hybrid?.transport).toBe("stdio")
  })

  test("skips malformed plugin remote config missing url", () => {
    // #given / #when
    const registry = createMcpRegistry({
      pluginServers: {
        broken: {
          type: "remote",
          // Intentionally malformed — should be silently skipped.
          url: "",
        },
      },
    })

    // #then
    expect(registry.effectiveServers).toHaveLength(0)
  })

  test("skips malformed plugin local config with empty command", () => {
    // #given / #when
    const registry = createMcpRegistry({
      pluginServers: {
        broken: {
          type: "local",
          command: [],
        },
      },
    })

    // #then
    expect(registry.effectiveServers).toHaveLength(0)
  })
})

describe("filterMcpRegistryServers", () => {
  test("filters by source or returns all", () => {
    // #given
    const registry = createMcpRegistry({
      builtinServers: {
        context7: {
          type: "remote",
          url: "https://mcp.context7.com/mcp",
          enabled: true,
        },
      },
      customServers: [
        {
          name: "sqlite",
          scope: "project",
          config: {
            command: "node",
            args: ["sqlite.js"],
          },
        },
      ],
    })

    // #then
    expect(filterMcpRegistryServers(registry, "builtin")).toHaveLength(1)
    expect(filterMcpRegistryServers(registry, "custom")).toHaveLength(1)
    expect(filterMcpRegistryServers(registry, "all")).toHaveLength(2)
  })
})
