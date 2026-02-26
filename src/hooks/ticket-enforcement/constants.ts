export const CODE_CHANGING_TOOLS = [
  "write",
  "edit",
  "multiedit",
  "hashline_edit",
  "bash",
] as const

export const WARN_MESSAGE =
  "⚠️ No active ticket. Consider creating one with `ticket_create` or starting one with `ticket_start`."

export const BLOCK_MESSAGE =
  "🚫 No active ticket. Create or start a ticket before making code changes. Use `ticket_create` or `ticket_start`."

export const READ_ONLY_TOOLS = ["read", "glob", "grep"] as const

export const READ_ONLY_PREFIXES = ["lsp_", "session_"] as const

export const TICKET_ALLOWLIST_TOOLS = [
  "ticket_create",
  "ticket_start",
  "ticket_show",
  "ticket_list",
  "ticket_close",
  "ticket_dep",
  "ticket_undep",
  "ticket_ready",
  "ticket_blocked",
] as const
