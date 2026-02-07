import type { SkillScope, LoadedSkill } from "../opencode-skill-loader/types"
import type { McpScope, ClaudeCodeMcpServer } from "../claude-code-mcp-loader"
import type { McpServerConfig } from "../claude-code-mcp-loader/types"

export type McpRegistrySource = "builtin" | "custom" | "plugin" | "skill"

export type McpRegistryScope = "builtin" | "plugin" | McpScope | SkillScope

export type McpTransport = "http" | "stdio"

export interface McpRegistryServerDescriptor {
  name: string
  source: McpRegistrySource
  scope: McpRegistryScope
  transport: McpTransport
  precedence: number
  config: ClaudeCodeMcpServer
  contextName?: string
}

export interface McpRegistryCollision {
  name: string
  winner: McpRegistryServerDescriptor
  overridden: McpRegistryServerDescriptor[]
}

export interface McpRegistryResult {
  allServers: McpRegistryServerDescriptor[]
  effectiveServers: McpRegistryServerDescriptor[]
  effectiveServersByName: Record<string, McpRegistryServerDescriptor>
  collisions: McpRegistryCollision[]
}

export interface CreateMcpRegistryInput {
  builtinServers?: Record<
    string,
    {
      type: "remote"
      url: string
      enabled: boolean
      headers?: Record<string, string>
    }
  >
  customServers?: Array<{ name: string; scope: McpScope; config: ClaudeCodeMcpServer }>
  pluginServers?: Record<string, McpServerConfig>
  skills?: LoadedSkill[]
}

export type McpQuerySource = McpRegistrySource | "all"
