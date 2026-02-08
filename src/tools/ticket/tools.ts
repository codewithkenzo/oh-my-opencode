import { tool } from "@opencode-ai/plugin/tool"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import * as api from "./client"
import {
  ticket_blockedDef,
  ticket_closeDef,
  ticket_createDef,
  ticket_depDef,
  ticket_listDef,
  ticket_readyDef,
  ticket_showDef,
  ticket_startDef,
  ticket_undepDef,
} from "./def"
import * as format from "./formatters"
import type { OutputFormat } from "./types"

export const ticket_ready: ToolDefinition = tool({
  ...ticket_readyDef,
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
  ...ticket_listDef,
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
  ...ticket_showDef,
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
  ...ticket_createDef,
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
  ...ticket_startDef,
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
  ...ticket_closeDef,
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
  ...ticket_depDef,
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
  ...ticket_undepDef,
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
  ...ticket_blockedDef,
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
