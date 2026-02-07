import type { ClaudeCodeMcpServer } from "../claude-code-mcp-loader"
import type { LoadedSkill } from "../opencode-skill-loader/types"
import type {
  CreateMcpRegistryInput,
  McpQuerySource,
  McpRegistryResult,
  McpRegistryServerDescriptor,
  McpTransport,
} from "./types"
import type { McpServerConfig } from "../claude-code-mcp-loader/types"
import { transformMcpServer } from "../claude-code-mcp-loader/transformer"

const SOURCE_PRECEDENCE = {
  builtin: 10,
  custom: 20,
  plugin: 30,
  skill: 40,
} as const

function inferTransport(config: ClaudeCodeMcpServer): McpTransport {
  if (config.type === "stdio") return "stdio"
  if (config.type === "http" || config.type === "sse" || config.url) return "http"
  return "stdio"
}

function pluginConfigToClaudeConfig(config: McpServerConfig): ClaudeCodeMcpServer {
  if (config.type === "remote") {
    if (!config.url) {
      throw new Error("Invalid plugin MCP remote config: missing url")
    }

    return {
      type: "http",
      url: config.url,
      headers: config.headers,
    }
  }

  if (!config.command) {
    throw new Error("Invalid plugin MCP local config: missing command")
  }

  if (config.command.length === 0) {
    throw new Error("Invalid plugin MCP local config: empty command array")
  }

  return {
    type: "stdio",
    command: config.command[0],
    args: config.command.slice(1),
    env: config.environment,
  }
}

function fromSkills(skills: LoadedSkill[]): McpRegistryServerDescriptor[] {
  const descriptors: McpRegistryServerDescriptor[] = []

  for (const skill of skills) {
    if (!skill.mcpConfig) continue

    for (const [serverName, config] of Object.entries(skill.mcpConfig)) {
      descriptors.push({
        name: serverName,
        source: "skill",
        scope: skill.scope,
        precedence: SOURCE_PRECEDENCE.skill,
        transport: inferTransport(config),
        config,
        contextName: skill.name,
      })
    }
  }

  return descriptors
}

function sortDescriptors(servers: McpRegistryServerDescriptor[]): McpRegistryServerDescriptor[] {
  return [...servers].sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name)
    if (a.precedence !== b.precedence) return b.precedence - a.precedence
    return a.source.localeCompare(b.source)
  })
}

export function createMcpRegistry(input: CreateMcpRegistryInput): McpRegistryResult {
  const allServers: McpRegistryServerDescriptor[] = []

  for (const [name, config] of Object.entries(input.builtinServers ?? {})) {
    let claudeConfig: ClaudeCodeMcpServer
    let transport: McpTransport

    if (config.type === "remote") {
      claudeConfig = {
        type: "http",
        url: config.url,
        headers: config.headers,
      }
      transport = "http"
    } else {
      claudeConfig = {
        type: "stdio",
        command: config.command,
        args: config.args,
        env: config.env,
      }
      transport = "stdio"
    }

    allServers.push({
      name,
      source: "builtin",
      scope: "builtin",
      precedence: SOURCE_PRECEDENCE.builtin,
      transport,
      config: claudeConfig,
      contextName: "builtin",
    })
  }

  for (const server of input.customServers ?? []) {
    allServers.push({
      name: server.name,
      source: "custom",
      scope: server.scope,
      precedence: SOURCE_PRECEDENCE.custom,
      transport: inferTransport(server.config),
      config: server.config,
      contextName: `custom:${server.scope}`,
    })
  }

  for (const [name, config] of Object.entries(input.pluginServers ?? {})) {
    try {
      const claudeConfig = pluginConfigToClaudeConfig(config)

      allServers.push({
        name,
        source: "plugin",
        scope: "plugin",
        precedence: SOURCE_PRECEDENCE.plugin,
        transport: inferTransport(claudeConfig),
        config: claudeConfig,
        contextName: "plugin",
      })
    } catch {
      // Skip plugin servers with invalid config (missing command/url)
    }
  }

  allServers.push(...fromSkills(input.skills ?? []))

  const effectiveByName = new Map<string, McpRegistryServerDescriptor>()
  const overriddenByName = new Map<string, McpRegistryServerDescriptor[]>()

  for (const server of allServers) {
    const current = effectiveByName.get(server.name)
    if (!current) {
      effectiveByName.set(server.name, server)
      continue
    }

    const shouldOverride =
      server.precedence > current.precedence ||
      // Same source and same precedence: allow later-loaded entry to override.
      // Different-source ties are kept stable (first loaded wins).
      (server.precedence === current.precedence && server.source === current.source)

    if (shouldOverride) {
      const overridden = overriddenByName.get(server.name) ?? []
      overridden.push(current)
      overriddenByName.set(server.name, overridden)
      effectiveByName.set(server.name, server)
      continue
    }

    const overridden = overriddenByName.get(server.name) ?? []
    overridden.push(server)
    overriddenByName.set(server.name, overridden)
  }

  const effectiveServers = sortDescriptors(Array.from(effectiveByName.values()))
  const effectiveServersByName = Object.fromEntries(
    effectiveServers.map((server) => [server.name, server])
  )

  const collisions = Array.from(overriddenByName.entries())
    .map(([name, overridden]) => {
      const winner = effectiveByName.get(name)
      if (!winner) return null
      return {
        name,
        winner,
        overridden: sortDescriptors(overridden),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    allServers: sortDescriptors(allServers),
    effectiveServers,
    effectiveServersByName,
    collisions,
  }
}

export function filterMcpRegistryServers(
  registry: McpRegistryResult,
  source: McpQuerySource
): McpRegistryServerDescriptor[] {
  if (source === "all") return registry.effectiveServers
  return registry.effectiveServers.filter((server) => server.source === source)
}

export function toRuntimeMcpServerMap(
  servers: McpRegistryServerDescriptor[]
): Record<string, McpServerConfig> {
  const map: Record<string, McpServerConfig> = {}

  for (const server of servers) {
    try {
      map[server.name] = transformMcpServer(server.name, server.config)
    } catch {
      // Skip servers with invalid configs during runtime map construction
    }
  }

  return map
}
