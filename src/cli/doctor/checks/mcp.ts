import type { CheckResult, CheckDefinition, McpServerInfo } from "../types"
import { CHECK_IDS, CHECK_NAMES } from "../constants"
import { createBuiltinMcps } from "../../../mcp"
import { loadRawMcpConfigs } from "../../../features/claude-code-mcp-loader"
import { createMcpRegistry, filterMcpRegistryServers } from "../../../features/mcp-registry"

export async function getBuiltinMcpInfo(): Promise<McpServerInfo[]> {
  const registry = createMcpRegistry({
    builtinServers: createBuiltinMcps(),
  })

  return filterMcpRegistryServers(registry, "builtin").map((server) => ({
    id: server.name,
    type: "builtin" as const,
    enabled: true,
    valid: true,
  }))
}

export async function getUserMcpInfo(): Promise<McpServerInfo[]> {
  const customServers = (await loadRawMcpConfigs()).loadedServers

  const registry = createMcpRegistry({
    customServers,
  })

  return filterMcpRegistryServers(registry, "custom").map((server) => {
    const config = server.config
    let valid = true
    let error: string | undefined

    if (!config || typeof config !== "object") {
      valid = false
      error = "Invalid config: not an object"
    } else if (config.type === "stdio" || (!config.type && !config.url)) {
      if (!config.command) {
        valid = false
        error = "Missing required field: command"
      }
    } else if (config.type === "http" || config.type === "sse" || config.url) {
      if (!config.url) {
        valid = false
        error = "Missing required field: url"
      }
    }

    return {
      id: server.name,
      type: "user" as const,
      enabled: true,
      valid,
      ...(error ? { error } : {}),
    }
  })
}

export async function checkBuiltinMcpServers(): Promise<CheckResult> {
  const servers = await getBuiltinMcpInfo()

  return {
    name: CHECK_NAMES[CHECK_IDS.MCP_BUILTIN],
    status: "pass",
    message: `${servers.length} built-in servers enabled`,
    details: servers.map((s) => `Enabled: ${s.id}`),
  }
}

export async function checkUserMcpServers(): Promise<CheckResult> {
  const servers = await getUserMcpInfo()

  if (servers.length === 0) {
    return {
      name: CHECK_NAMES[CHECK_IDS.MCP_USER],
      status: "skip",
      message: "No user MCP configuration found",
      details: ["Optional: Add .mcp.json for custom MCP servers"],
    }
  }

  const invalidServers = servers.filter((s) => !s.valid)
  if (invalidServers.length > 0) {
    return {
      name: CHECK_NAMES[CHECK_IDS.MCP_USER],
      status: "warn",
      message: `${invalidServers.length} server(s) have configuration issues`,
      details: [
        ...servers.filter((s) => s.valid).map((s) => `Valid: ${s.id}`),
        ...invalidServers.map((s) => `Invalid: ${s.id} - ${s.error}`),
      ],
    }
  }

  return {
    name: CHECK_NAMES[CHECK_IDS.MCP_USER],
    status: "pass",
    message: `${servers.length} user server(s) configured`,
    details: servers.map((s) => `Configured: ${s.id}`),
  }
}

export function getMcpCheckDefinitions(): CheckDefinition[] {
  return [
    {
      id: CHECK_IDS.MCP_BUILTIN,
      name: CHECK_NAMES[CHECK_IDS.MCP_BUILTIN],
      category: "tools",
      check: checkBuiltinMcpServers,
      critical: false,
    },
    {
      id: CHECK_IDS.MCP_USER,
      name: CHECK_NAMES[CHECK_IDS.MCP_USER],
      category: "tools",
      check: checkUserMcpServers,
      critical: false,
    },
  ]
}
