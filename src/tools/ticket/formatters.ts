import type { Ticket, OutputFormat } from "./types"

export function formatTicket(ticket: Ticket, fmt: OutputFormat = "markdown"): string {
  if (fmt === "json") {
    return JSON.stringify(ticket, null, 2)
  }

  if (fmt === "compact") {
    const deps = ticket.dependencies.length > 0 ? ` → [${ticket.dependencies.join(", ")}]` : ""
    return `[${ticket.id}] ${ticket.title} ${deps} (P${ticket.priority})`
  }

  const deps =
    ticket.dependencies.length > 0
      ? ticket.dependencies.map((d) => `- [${d}]`).join("\n                  ")
      : "None"

  return `## ${ticket.title}

**ID**: ${ticket.id}
**Status**: ${ticket.status}
**Priority**: ${ticket.priority}${ticket.type ? `\n**Type**: ${ticket.type}` : ""}${ticket.assignee ? `\n**Assignee**: ${ticket.assignee}` : ""}
**Created**: ${ticket.created}
**Dependencies**: ${deps}${ticket.description ? `\n\n${ticket.description}` : ""}`
}

export function formatTickets(tickets: Ticket[], fmt: OutputFormat = "markdown"): string {
  if (fmt === "json") {
    return JSON.stringify(tickets, null, 2)
  }

  if (fmt === "compact") {
    if (tickets.length === 0) return "No tickets found."
    return tickets
      .map((t) => {
        const deps = t.dependencies.length > 0 ? ` → [${t.dependencies.join(", ")}]` : ""
        return `[${t.id}] ${t.title}${deps} (P${t.priority})`
      })
      .join("\n")
  }

  if (tickets.length === 0) return "No tickets found."

  return tickets
    .map((t) => {
      const deps = t.dependencies.length > 0 ? ` → [${t.dependencies.join(", ")}]` : ""
      return `- **[${t.id}]** ${t.title} \`${t.status}\` (P${t.priority})${deps}`
    })
    .join("\n")
}
