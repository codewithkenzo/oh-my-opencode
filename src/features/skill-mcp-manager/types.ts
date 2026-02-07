import type { ClaudeCodeMcpServer } from "../claude-code-mcp-loader/types"

export type SkillMcpConfig = Record<string, ClaudeCodeMcpServer>

export interface McpClientInfo {
  serverName: string
  sessionID: string
  contextName?: string
  skillName?: string
}

export interface McpServerContext {
  config: ClaudeCodeMcpServer
  contextName?: string
  skillName?: string
}

// Backward-compatible aliases for existing skill MCP callsites.
export type SkillMcpClientInfo = McpClientInfo
export type SkillMcpServerContext = McpServerContext
