import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"
import { loadRawMcpConfigs } from "../../features/claude-code-mcp-loader"
import { createMcpRegistry, filterMcpRegistryServers, type McpRegistryResult, type McpRegistryServerDescriptor } from "../../features/mcp-registry"
import type { LoadedSkill } from "../../features/opencode-skill-loader/types"
import type { McpClientManager, McpClientInfo, McpServerContext } from "../../features/skill-mcp-manager"
import type { McpServerConfig } from "../../features/claude-code-mcp-loader/types"
import { createBuiltinMcps } from "../../mcp"
import { MCP_QUERY_CONTEXT_NAME, MCP_QUERY_DESCRIPTION } from "./constants"
import type { McpQueryArgs } from "./types"

interface McpQueryToolOptions {
  manager: McpClientManager
  getSessionID: () => string
  includeCustomMcp?: boolean
  disabledBuiltinMcps?: string[]
  getLoadedSkills?: () => LoadedSkill[]
  loadPluginMcpServers?: () => Promise<Record<string, McpServerConfig>>
  loadRegistry?: () => Promise<McpRegistryResult>
}

interface QueryOperation {
  type: "tool" | "resource" | "prompt"
  name: string
  description?: string
}

interface QueryServerResult {
  server_name: string
  source: "builtin" | "custom" | "plugin" | "skill"
  scope: string
  precedence: number
  transport: "http" | "stdio"
  context_name?: string
  query_match: "server" | "operation" | "both"
  operations: QueryOperation[]
  counts: {
    tools: number
    resources: number
    prompts: number
  }
  errors?: string[]
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").toLowerCase()
}

function buildServerSearchText(server: McpRegistryServerDescriptor): string {
  const parts: string[] = [
    server.name,
    server.source,
    server.scope,
    server.transport,
    server.contextName ?? "",
  ]
  if (server.config.url) {
    parts.push(server.config.url)
  }
  if (server.config.command) {
    parts.push(server.config.command)
  }
  if (server.config.args) {
    parts.push(server.config.args.join(" "))
  }
  return normalizeText(parts.join(" "))
}

function toOperationSearchText(operation: QueryOperation): string {
  return normalizeText(`${operation.type} ${operation.name} ${operation.description ?? ""}`)
}

function getResourceName(resource: { uri?: string; name?: string }): string {
  if (resource.uri && resource.uri.length > 0) {
    return resource.uri
  }
  return resource.name ?? "unknown-resource"
}

async function defaultLoadRegistry(options: McpQueryToolOptions): Promise<McpRegistryResult> {
  const customServers = options.includeCustomMcp === false
    ? []
    : (await loadRawMcpConfigs()).loadedServers

  let pluginServers: Record<string, McpServerConfig> = {}
  if (options.loadPluginMcpServers) {
    try {
      pluginServers = await options.loadPluginMcpServers()
    } catch {
      // Plugin MCP discovery failed; continue with other sources
    }
  }

  return createMcpRegistry({
    builtinServers: createBuiltinMcps(options.disabledBuiltinMcps ?? []),
    customServers,
    pluginServers,
    skills: options.getLoadedSkills?.() ?? [],
  })
}

export function createMcpQueryTool(options: McpQueryToolOptions): ToolDefinition {
  const loadRegistry = options.loadRegistry ?? (() => defaultLoadRegistry(options))
  const includeCustomMcp = options.includeCustomMcp ?? true

  return tool({
    description: MCP_QUERY_DESCRIPTION,
    args: {
      query: tool.schema.string().optional().describe("Case-insensitive filter over server metadata and operation names/descriptions"),
      server_name: tool.schema.string().optional().describe("Exact server name filter"),
      source: tool.schema.enum(["custom", "skill", "builtin", "plugin", "all"]).optional().describe("MCP source to query (default: custom)"),
      scope: tool.schema.enum(["user", "project", "local"]).optional().describe("Filter by MCP config scope"),
      include_operations: tool.schema.boolean().optional().describe("When true (default), connect and list tools/resources/prompts"),
      limit: tool.schema.number().int().positive().optional().describe("Maximum servers returned (default 20, max 200)"),
    },
    async execute(args: McpQueryArgs) {
      const source = args.source ?? "custom"

      if (!includeCustomMcp && source === "custom") {
        throw new Error(
          "Custom MCP loading is disabled by `claude_code.mcp=false`. Enable it to use `mcp_query`."
        )
      }

      const includeOperations = args.include_operations ?? true
      const query = args.query?.trim().toLowerCase()
      const limit = Math.min(Math.max(args.limit ?? 20, 1), 200)

      const registry = await loadRegistry()
      let servers = filterMcpRegistryServers(registry, source)

      if (args.server_name) {
        servers = servers.filter((server) => server.name === args.server_name)
      }

      if (args.scope) {
        servers = servers.filter((server) => server.source === "custom" ? server.scope === args.scope : true)
      }

      const candidateServers = servers.length
      servers = servers.slice(0, limit)

      const results: QueryServerResult[] = []

      for (const server of servers) {
        const serverText = buildServerSearchText(server)
        const serverMatches = query ? serverText.includes(query) : true

        if (!includeOperations) {
          if (query && !serverMatches) continue

          results.push({
            server_name: server.name,
            source: server.source,
            scope: server.scope,
            precedence: server.precedence,
            transport: server.transport,
            context_name: server.contextName,
            query_match: "server",
            operations: [],
            counts: {
              tools: 0,
              resources: 0,
              prompts: 0,
            },
          })
          continue
        }

        const info: McpClientInfo = {
          serverName: server.name,
          contextName: server.contextName ?? MCP_QUERY_CONTEXT_NAME,
          sessionID: options.getSessionID(),
        }

        const context: McpServerContext = {
          config: server.config,
          contextName: server.contextName ?? MCP_QUERY_CONTEXT_NAME,
        }

        const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
          options.manager.listTools(info, context),
          options.manager.listResources(info, context),
          options.manager.listPrompts(info, context),
        ])

        const errors: string[] = []
        const operations: QueryOperation[] = []

        if (toolsResult.status === "fulfilled") {
          operations.push(
            ...toolsResult.value.map((entry) => ({
              type: "tool" as const,
              name: entry.name,
              description: entry.description,
            }))
          )
        } else {
          errors.push(`tools: ${toolsResult.reason instanceof Error ? toolsResult.reason.message : String(toolsResult.reason)}`)
        }

        if (resourcesResult.status === "fulfilled") {
          operations.push(
            ...resourcesResult.value.map((entry) => ({
              type: "resource" as const,
              name: getResourceName(entry),
              description: entry.description,
            }))
          )
        } else {
          errors.push(`resources: ${resourcesResult.reason instanceof Error ? resourcesResult.reason.message : String(resourcesResult.reason)}`)
        }

        if (promptsResult.status === "fulfilled") {
          operations.push(
            ...promptsResult.value.map((entry) => ({
              type: "prompt" as const,
              name: entry.name,
              description: entry.description,
            }))
          )
        } else {
          errors.push(`prompts: ${promptsResult.reason instanceof Error ? promptsResult.reason.message : String(promptsResult.reason)}`)
        }

        const filteredOperations = query
          ? operations.filter((operation) => toOperationSearchText(operation).includes(query))
          : operations

        const operationMatches = query ? filteredOperations.length > 0 : true

        if (query && !serverMatches && !operationMatches) {
          continue
        }

        const queryMatch: QueryServerResult["query_match"] =
          serverMatches && operationMatches ? "both" : serverMatches ? "server" : "operation"

        const toolsCount = filteredOperations.filter((entry) => entry.type === "tool").length
        const resourcesCount = filteredOperations.filter((entry) => entry.type === "resource").length
        const promptsCount = filteredOperations.filter((entry) => entry.type === "prompt").length

        const result: QueryServerResult = {
          server_name: server.name,
          source: server.source,
          scope: server.scope,
          precedence: server.precedence,
          transport: server.transport,
          context_name: server.contextName,
          query_match: queryMatch,
          operations: filteredOperations,
          counts: {
            tools: toolsCount,
            resources: resourcesCount,
            prompts: promptsCount,
          },
        }

        if (errors.length > 0) {
          result.errors = errors
        }

        results.push(result)
      }

      const limitedResults = results

      return JSON.stringify(
        {
          total_servers: results.length,
          candidate_servers: candidateServers,
          returned_servers: limitedResults.length,
          source,
          collisions: registry.collisions.map((collision) => ({
            name: collision.name,
            winner: {
              source: collision.winner.source,
              scope: collision.winner.scope,
              context_name: collision.winner.contextName,
            },
            overridden: collision.overridden.map((entry) => ({
              source: entry.source,
              scope: entry.scope,
              context_name: entry.contextName,
            })),
          })),
          include_operations: includeOperations,
          query: args.query ?? null,
          servers: limitedResults,
        },
        null,
        2
      )
    },
  })
}
