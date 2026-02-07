import type { ToolDefinition } from "@opencode-ai/plugin/tool"

/**
 * Route policy for hybrid tools that can use either built-in or MCP path.
 * - "builtin-only": Always use the built-in implementation (default for most tools)
 * - "mcp-first": Try MCP path first, fall back to built-in if MCP unavailable
 * - "mcp-only": Only use MCP path, error if unavailable
 */
export type ToolRoutePolicy = "builtin-only" | "mcp-first" | "mcp-only"

export interface ToolRouteConfig {
  /** The route policy for this tool */
  policy: ToolRoutePolicy
  /** The MCP server name to route to (e.g., "websearch", "context7") */
  mcpServerName?: string
  /** The MCP tool name to call on the server */
  mcpToolName?: string
}

export interface HybridToolOptions {
  /** Tool name for logging */
  name: string
  /** The built-in tool implementation (fallback) */
  builtinTool: ToolDefinition
  /** Route configuration */
  route: ToolRouteConfig
  /** Function to check if MCP server is available */
  checkMcpAvailable?: () => Promise<boolean>
}

export type ToolRoutingMap = Record<string, ToolRouteConfig>

/**
 * Default route policies for hybrid tools.
 * All default to "builtin-only" for zero behavior change.
 * Users can override via lazy_loading.tool_routing config.
 */
export const DEFAULT_TOOL_ROUTES: ToolRoutingMap = {
  // Research tools - already bridge to remote MCP endpoints
  exa_websearch: { policy: "builtin-only", mcpServerName: "websearch", mcpToolName: "web_search_exa" },
  exa_codesearch: { policy: "builtin-only", mcpServerName: "websearch", mcpToolName: "get_code_context_exa" },
  context7_resolve_library_id: { policy: "builtin-only", mcpServerName: "context7", mcpToolName: "resolve-library-id" },
  context7_query_docs: { policy: "builtin-only", mcpServerName: "context7", mcpToolName: "get-library-docs" },
  grep_app_searchGitHub: { policy: "builtin-only", mcpServerName: "grep_app", mcpToolName: "searchGitHub" },
  zread_search: { policy: "builtin-only", mcpServerName: "zread" },
  zread_file: { policy: "builtin-only", mcpServerName: "zread" },
  zread_structure: { policy: "builtin-only", mcpServerName: "zread" },
  // Local service tools
  syncthing_status: { policy: "builtin-only", mcpServerName: "syncthing" },
  syncthing_folders: { policy: "builtin-only", mcpServerName: "syncthing" },
  syncthing_devices: { policy: "builtin-only", mcpServerName: "syncthing" },
  syncthing_connections: { policy: "builtin-only", mcpServerName: "syncthing" },
  // Memory tool
  supermemory: { policy: "builtin-only", mcpServerName: "supermemory" },
}

/**
 * Get the route policy for a tool, falling back to defaults then "builtin-only".
 */
export function getToolRouteConfig(
  toolName: string,
  overrides?: ToolRoutingMap,
): ToolRouteConfig {
  if (overrides?.[toolName]) {
    return overrides[toolName]
  }
  if (DEFAULT_TOOL_ROUTES[toolName]) {
    return DEFAULT_TOOL_ROUTES[toolName]
  }
  return { policy: "builtin-only" }
}

/**
 * Get the route policy for an MCP server name.
 * Looks up which hybrid tools map to this server and returns the policy.
 */
export function getRoutePolicyForServer(
  serverName: string,
  overrides?: ToolRoutingMap,
): ToolRoutePolicy | undefined {
  const allRoutes = { ...DEFAULT_TOOL_ROUTES, ...overrides }
  for (const config of Object.values(allRoutes)) {
    if (config.mcpServerName === serverName) {
      return config.policy
    }
  }
  return undefined
}
