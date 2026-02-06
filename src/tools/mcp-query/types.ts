import type { McpScope } from "../../features/claude-code-mcp-loader"
import type { McpQuerySource } from "../../features/mcp-registry"

export interface McpQueryArgs {
  query?: string
  server_name?: string
  scope?: McpScope
  source?: McpQuerySource
  include_operations?: boolean
  limit?: number
}
