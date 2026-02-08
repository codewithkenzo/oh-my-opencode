import { tool } from "@opencode-ai/plugin/tool"

const formatArg = {
  format: tool.schema
    .enum(["markdown" as const, "json" as const, "compact" as const])
    .optional()
    .describe("Output format: markdown (default), json, or compact"),
}

export const ticket_readyDef = {
  description: "List tickets with no blockers. Filter by status, priority, type, or search.",
  args: {
    status: tool.schema.string().optional().describe("Filter by status"),
    priority: tool.schema.number().optional().describe("Filter by priority (0-4)"),
    type: tool.schema.string().optional().describe("Filter by type"),
    search: tool.schema.string().optional().describe("Search in title"),
    ...formatArg,
  },
}

export const ticket_listDef = {
  description: "List all tickets with optional filtering by status, priority, type, and search.",
  args: {
    status: tool.schema.string().optional().describe("Filter by status"),
    priority: tool.schema.number().optional().describe("Filter by priority (0-4)"),
    type: tool.schema.string().optional().describe("Filter by type"),
    search: tool.schema.string().optional().describe("Search in title"),
    ...formatArg,
  },
}

export const ticket_showDef = {
  description: "Show detailed information about a single ticket by ID.",
  args: {
    id: tool.schema.string().describe("Ticket ID (required)"),
    format: tool.schema
      .enum(["markdown" as const, "json" as const, "compact" as const])
      .optional()
      .describe("Output format: markdown (default), json, or compact"),
  },
}

export const ticket_createDef = {
  description:
    "Create a new ticket. Priority: 0=critical, 1=high, 2=medium (default), 3=low, 4=nice-to-have.",
  args: {
    title: tool.schema.string().describe("Ticket title (required)"),
    type: tool.schema.string().optional().describe("Ticket type"),
    priority: tool.schema
      .number()
      .min(0)
      .max(4)
      .optional()
      .describe("Priority (0-4)"),
    description: tool.schema.string().optional().describe("Ticket description"),
    status: tool.schema.string().optional().describe("Initial status"),
  },
}

export const ticket_startDef = {
  description: "Start working on a ticket by ID.",
  args: {
    id: tool.schema.string().describe("Ticket ID (required)"),
  },
}

export const ticket_closeDef = {
  description: "Close a ticket with a completion reason (default: completed).",
  args: {
    id: tool.schema.string().describe("Ticket ID (required)"),
    reason: tool.schema
      .string()
      .optional()
      .describe("Completion reason (default: completed)"),
  },
}

export const ticket_depDef = {
  description: "Add a dependency between two tickets. Makes 'from' depend on 'to'.",
  args: {
    from: tool.schema.string().describe("Dependent ticket ID (required)"),
    to: tool.schema.string().describe("Dependency ticket ID (required)"),
  },
}

export const ticket_undepDef = {
  description: "Remove a dependency between two tickets.",
  args: {
    from: tool.schema.string().describe("Dependent ticket ID (required)"),
    to: tool.schema.string().describe("Dependency ticket ID (required)"),
  },
}

export const ticket_blockedDef = {
  description: "List tickets that are blocked by unresolved dependencies.",
  args: {
    status: tool.schema.string().optional().describe("Filter by status"),
    priority: tool.schema.number().optional().describe("Filter by priority (0-4)"),
    type: tool.schema.string().optional().describe("Filter by type"),
    search: tool.schema.string().optional().describe("Search in title"),
    ...formatArg,
  },
}

export const ticketToolDefs = {
  ticket_ready: ticket_readyDef,
  ticket_list: ticket_listDef,
  ticket_show: ticket_showDef,
  ticket_create: ticket_createDef,
  ticket_start: ticket_startDef,
  ticket_close: ticket_closeDef,
  ticket_dep: ticket_depDef,
  ticket_undep: ticket_undepDef,
  ticket_blocked: ticket_blockedDef,
}
