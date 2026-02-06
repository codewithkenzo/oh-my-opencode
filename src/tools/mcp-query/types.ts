import type { McpScope } from "../../features/claude-code-mcp-loader"

export interface McpQueryArgs {
  query?: string
  server_name?: string
  scope?: McpScope
  include_operations?: boolean
  limit?: number
}
