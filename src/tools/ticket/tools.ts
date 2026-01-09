import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import * as api from "./client"
import * as format from "./formatters"
import type { OutputFormat } from "./types"

const formatArg = {
  format: tool.schema
    .enum(["markdown" as const, "json" as const, "compact" as const])
    .optional()
    .describe("Output format: markdown (default), json, or compact"),
}

export const ticket_ready: ToolDefinition = tool({
  description: "List tickets with no blockers. Filter by status, priority, type, or search.",
  args: {
    status: tool.schema.string().optional().describe("Filter by status"),
    priority: tool.schema.number().optional().describe("Filter by priority (0-4)"),
    type: tool.schema.string().optional().describe("Filter by type"),
    search: tool.schema.string().optional().describe("Search in title"),
    ...formatArg,
  },
  async execute({ status, priority, type, search, format: fmt = "markdown" }) {
    try {
      const tickets = await api.getReadyTickets()
      const filtered = tickets.filter((t) => {
        if (status && t.status !== status) return false
        if (priority !== undefined && t.priority !== priority) return false
        if (type && t.type !== type) return false
        if (search && !t.title.includes(search)) return false
        return true
      })
      return format.formatTickets(filtered, fmt as OutputFormat)
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticket_list: ToolDefinition = tool({
  description: "List all tickets with optional filtering by status, priority, type, and search.",
  args: {
    status: tool.schema.string().optional().describe("Filter by status"),
    priority: tool.schema.number().optional().describe("Filter by priority (0-4)"),
    type: tool.schema.string().optional().describe("Filter by type"),
    search: tool.schema.string().optional().describe("Search in title"),
    ...formatArg,
  },
  async execute({ status, priority, type, search, format: fmt = "markdown" }) {
    try {
      const tickets = await api.listTickets({ status, priority, type, search })
      return format.formatTickets(tickets, fmt as OutputFormat)
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticket_show: ToolDefinition = tool({
  description: "Show detailed information about a single ticket by ID.",
  args: {
    id: tool.schema.string().describe("Ticket ID (required)"),
    format: tool.schema
      .enum(["markdown" as const, "json" as const, "compact" as const])
      .optional()
      .describe("Output format: markdown (default), json, or compact"),
  },
  async execute({ id, format: fmt = "markdown" }) {
    try {
      const ticket = await api.showTicket(id)
      return format.formatTicket(ticket, fmt as OutputFormat)
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticket_create: ToolDefinition = tool({
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
  async execute({ title, type, priority, description, status }) {
    try {
      const ticket = await api.createTicket(title, { type, priority, description, status })
      const result = format.formatTicket(ticket, "markdown")
      return `✓ Ticket created!\n\n${result}`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticket_start: ToolDefinition = tool({
  description: "Start working on a ticket by ID.",
  args: {
    id: tool.schema.string().describe("Ticket ID (required)"),
  },
  async execute({ id }) {
    try {
      const output = await api.startTicket(id)
      return `✓ Ticket started!\n\n${output}`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticket_close: ToolDefinition = tool({
  description: "Close a ticket with a completion reason (default: completed).",
  args: {
    id: tool.schema.string().describe("Ticket ID (required)"),
    reason: tool.schema
      .string()
      .optional()
      .describe("Completion reason (default: completed)"),
  },
  async execute({ id, reason = "completed" }) {
    try {
      const output = await api.closeTicket(id, reason)
      return `✓ Ticket closed!\n\n${output}`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticket_dep: ToolDefinition = tool({
  description: "Add a dependency between two tickets. Makes 'from' depend on 'to'.",
  args: {
    from: tool.schema.string().describe("Dependent ticket ID (required)"),
    to: tool.schema.string().describe("Dependency ticket ID (required)"),
  },
  async execute({ from, to }) {
    try {
      const output = await api.addDependency(from, to)
      return `✓ Dependency added!\n\n${output}`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticket_undep: ToolDefinition = tool({
  description: "Remove a dependency between two tickets.",
  args: {
    from: tool.schema.string().describe("Dependent ticket ID (required)"),
    to: tool.schema.string().describe("Dependency ticket ID (required)"),
  },
  async execute({ from, to }) {
    try {
      const output = await api.removeDependency(from, to)
      return `✓ Dependency removed!\n\n${output}`
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticket_blocked: ToolDefinition = tool({
  description: "List tickets that are blocked by unresolved dependencies.",
  args: {
    status: tool.schema.string().optional().describe("Filter by status"),
    priority: tool.schema.number().optional().describe("Filter by priority (0-4)"),
    type: tool.schema.string().optional().describe("Filter by type"),
    search: tool.schema.string().optional().describe("Search in title"),
    ...formatArg,
  },
  async execute({ status, priority, type, search, format: fmt = "markdown" }) {
    try {
      const tickets = await api.getBlockedTickets()
      const filtered = tickets.filter((t) => {
        if (status && t.status !== status) return false
        if (priority !== undefined && t.priority !== priority) return false
        if (type && t.type !== type) return false
        if (search && !t.title.includes(search)) return false
        return true
      })
      return format.formatTickets(filtered, fmt as OutputFormat)
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  },
})

export const ticketTools: Record<string, ToolDefinition> = {
  ticket_ready,
  ticket_list,
  ticket_show,
  ticket_create,
  ticket_start,
  ticket_close,
  ticket_dep,
  ticket_undep,
  ticket_blocked,
}
