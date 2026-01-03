import { z } from "zod"
import { McpNameSchema } from "../mcp/types"

const PermissionValue = z.enum(["ask", "allow", "deny"])

const BashPermission = z.union([
  PermissionValue,
  z.record(z.string(), PermissionValue),
])

const AgentPermissionSchema = z.object({
  edit: PermissionValue.optional(),
  bash: BashPermission.optional(),
  webfetch: PermissionValue.optional(),
  doom_loop: PermissionValue.optional(),
  external_directory: PermissionValue.optional(),
})

export const BuiltinAgentNameSchema = z.enum([
  "Musashi",
  "Kenja - advisor",
  "Shisho - researcher",
  "Ninja - explorer",
  "Shokunin - designer",
  "Takumi - builder",
  "Daiku - builder",
  "Hayai - builder",
  "Tantei - debugger",
  "Koji - debugger",
  "Sakka - writer",
  "Miru - critic",
  "Senshi - distributor",
  "Seichou - growth",
  "Tsunagi - networker",
])

export const OverridableAgentNameSchema = z.enum([
  "build",
  "plan",
  "Musashi",
  "OpenCode-Builder",
  "Planner-Musashi",
  "Kenja - advisor",
  "Shisho - researcher",
  "Ninja - explorer",
  "Shokunin - designer",
  "Takumi - builder",
  "Daiku - builder",
  "Hayai - builder",
  "Tantei - debugger",
  "Koji - debugger",
  "Sakka - writer",
  "Miru - critic",
  "Senshi - distributor",
  "Seichou - growth",
  "Tsunagi - networker",
])

export const AgentNameSchema = BuiltinAgentNameSchema

export const HookNameSchema = z.enum([
  "todo-continuation-enforcer",
  "context-window-monitor",
  "session-recovery",
  "session-notification",
  "comment-checker",
  "tool-output-truncator",
  "directory-agents-injector",
  "directory-readme-injector",
  "empty-task-response-detector",
  "think-mode",
  "anthropic-auto-compact",
  "preemptive-compaction",
  "compaction-context-injector",
  "rules-injector",
  "background-notification",
  "auto-update-checker",
  "startup-toast",
  "keyword-detector",
  "agent-usage-reminder",
  "non-interactive-env",
  "interactive-bash-session",
  "empty-message-sanitizer",
  "thinking-block-validator",
  "claude-code-hooks",
  "browser-relay",
  "skill-enforcer",
  "agents-md-enforcer",
  "runware-notification",
])

export const AgentOverrideConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  prompt: z.string().optional(),
  prompt_append: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  disable: z.boolean().optional(),
  description: z.string().optional(),
  mode: z.enum(["subagent", "primary", "all"]).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  permission: AgentPermissionSchema.optional(),
})

export const AgentOverridesSchema = z.object({
  build: AgentOverrideConfigSchema.optional(),
  plan: AgentOverrideConfigSchema.optional(),
  Musashi: AgentOverrideConfigSchema.optional(),
  "OpenCode-Builder": AgentOverrideConfigSchema.optional(),
  "Planner-Musashi": AgentOverrideConfigSchema.optional(),
  "Kenja - advisor": AgentOverrideConfigSchema.optional(),
  "Shisho - researcher": AgentOverrideConfigSchema.optional(),
  "Ninja - explorer": AgentOverrideConfigSchema.optional(),
  "Shokunin - designer": AgentOverrideConfigSchema.optional(),
  "Takumi - builder": AgentOverrideConfigSchema.optional(),
  "Daiku - builder": AgentOverrideConfigSchema.optional(),
  "Hayai - builder": AgentOverrideConfigSchema.optional(),
  "Tantei - debugger": AgentOverrideConfigSchema.optional(),
  "Koji - debugger": AgentOverrideConfigSchema.optional(),
  "Sakka - writer": AgentOverrideConfigSchema.optional(),
  "Miru - critic": AgentOverrideConfigSchema.optional(),
  "Senshi - distributor": AgentOverrideConfigSchema.optional(),
  "Seichou - growth": AgentOverrideConfigSchema.optional(),
  "Tsunagi - networker": AgentOverrideConfigSchema.optional(),
})

export const ClaudeCodeConfigSchema = z.object({
  mcp: z.boolean().optional(),
  commands: z.boolean().optional(),
  skills: z.boolean().optional(),
  agents: z.boolean().optional(),
  hooks: z.boolean().optional(),
})

export const MusashiAgentConfigSchema = z.object({
  disabled: z.boolean().optional(),
  default_builder_enabled: z.boolean().optional(),
  planner_enabled: z.boolean().optional(),
  replace_plan: z.boolean().optional(),
})

export const DynamicContextPruningConfigSchema = z.object({
  /** Enable dynamic context pruning (default: false) */
  enabled: z.boolean().default(false),
  /** Notification level: off, minimal, or detailed (default: detailed) */
  notification: z.enum(["off", "minimal", "detailed"]).default("detailed"),
  /** Turn protection - prevent pruning recent tool outputs */
  turn_protection: z.object({
    enabled: z.boolean().default(true),
    turns: z.number().min(1).max(10).default(3),
  }).optional(),
  /** Tools that should never be pruned */
  protected_tools: z.array(z.string()).default([
    "task", "todowrite", "todoread",
    "lsp_rename", "lsp_code_action_resolve",
    "session_read", "session_write", "session_search",
  ]),
  /** Pruning strategies configuration */
  strategies: z.object({
    /** Remove duplicate tool calls (same tool + same args) */
    deduplication: z.object({
      enabled: z.boolean().default(true),
    }).optional(),
    /** Prune write inputs when file subsequently read */
    supersede_writes: z.object({
      enabled: z.boolean().default(true),
      /** Aggressive mode: prune any write if ANY subsequent read */
      aggressive: z.boolean().default(false),
    }).optional(),
    /** Prune errored tool inputs after N turns */
    purge_errors: z.object({
      enabled: z.boolean().default(true),
      turns: z.number().min(1).max(20).default(5),
    }).optional(),
  }).optional(),
})

export const SkillsConfigSchema = z.object({
  workspace_loader: z.boolean().optional().default(true),
  default_max_size: z.number().optional().default(2048),
  max_total_size: z.number().optional().default(32768),
})

export const ExperimentalConfigSchema = z.object({
  aggressive_truncation: z.boolean().optional(),
  auto_resume: z.boolean().optional(),
  /** Enable preemptive compaction at threshold (default: true) */
  preemptive_compaction: z.boolean().optional(),
  /** Threshold percentage to trigger preemptive compaction (default: 0.80) */
  preemptive_compaction_threshold: z.number().min(0.5).max(0.95).optional(),
  /** Inject supermemory context during compaction (default: true) */
  inject_supermemory_context: z.boolean().optional(),
  /** Truncate all tool outputs, not just whitelisted tools (default: true) */
  truncate_all_tool_outputs: z.boolean().default(true),
  /** Dynamic context pruning configuration */
  dynamic_context_pruning: DynamicContextPruningConfigSchema.optional(),
})

// Lenient schemas for disabled_* arrays - accept any string for backward compatibility
// with deprecated/removed hooks, agents, and mcps. Unknown values are silently ignored.
const DisabledMcpsSchema = z.array(z.string()).optional()
const DisabledAgentsSchema = z.array(z.string()).optional()
const DisabledHooksSchema = z.array(z.string()).optional()

export const OhMyOpenCodeConfigSchema = z.object({
  $schema: z.string().optional(),
  disabled_mcps: DisabledMcpsSchema,
  disabled_agents: DisabledAgentsSchema,
  disabled_hooks: DisabledHooksSchema,
  agents: AgentOverridesSchema.optional(),
  claude_code: ClaudeCodeConfigSchema.optional(),
  google_auth: z.boolean().optional(),
  musashi_agent: MusashiAgentConfigSchema.optional(),
  skills: SkillsConfigSchema.optional(),
  experimental: ExperimentalConfigSchema.optional(),
  auto_update: z.boolean().optional(),
})

export type OhMyOpenCodeConfig = z.infer<typeof OhMyOpenCodeConfigSchema>
export type AgentOverrideConfig = z.infer<typeof AgentOverrideConfigSchema>
export type AgentOverrides = z.infer<typeof AgentOverridesSchema>
export type AgentName = z.infer<typeof AgentNameSchema>
export type HookName = z.infer<typeof HookNameSchema>
export type MusashiAgentConfig = z.infer<typeof MusashiAgentConfigSchema>
export type SkillsConfig = z.infer<typeof SkillsConfigSchema>
export type ExperimentalConfig = z.infer<typeof ExperimentalConfigSchema>
export type DynamicContextPruningConfig = z.infer<typeof DynamicContextPruningConfigSchema>

export { McpNameSchema, type McpName } from "../mcp/types"
