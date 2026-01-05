import { spawn } from "node:child_process"
import type { Ticket, CreateOptions, ListOptions } from "./types"

const TIMEOUT_MS = 30000
let tkAvailable: boolean | null = null

interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

function execTk(args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let completed = false

    const proc = spawn("tk", args, {
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString()
    })

    timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true
        proc.kill()
        reject(new Error(`Command timed out after ${TIMEOUT_MS}ms`))
      }
    }, TIMEOUT_MS)

    proc.on("close", (code: number | null) => {
      if (!completed) {
        completed = true
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
        resolve({ stdout, stderr, exitCode: code ?? 0 })
      }
    })

    proc.on("error", (err: Error) => {
      if (!completed) {
        completed = true
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
        reject(err)
      }
    })
  })
}

export async function isTkAvailable(): Promise<boolean> {
  if (tkAvailable !== null) {
    return tkAvailable
  }

  try {
    const result = await execTk(["--version"])
    tkAvailable = result.exitCode === 0
    return tkAvailable
  } catch {
    tkAvailable = false
    return false
  }
}

function parseTicketFromMarkdown(markdown: string): Ticket {
  const lines = markdown.split("\n")
  const ticket: Partial<Ticket> = {
    id: "",
    title: "",
    status: "open",
    priority: 2,
    dependencies: [],
    created: new Date().toISOString(),
  }

  let inFrontmatter = false
  let foundFrontmatterEnd = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Handle YAML frontmatter
    if (trimmed === "---") {
      if (!inFrontmatter) {
        inFrontmatter = true
        continue
      } else {
        inFrontmatter = false
        foundFrontmatterEnd = true
        continue
      }
    }

    if (inFrontmatter) {
      // Parse YAML frontmatter fields
      const idMatch = trimmed.match(/^id:\s*(.+)$/)
      if (idMatch) {
        ticket.id = idMatch[1].trim()
        continue
      }

      const statusMatch = trimmed.match(/^status:\s*(.+)$/)
      if (statusMatch) {
        ticket.status = statusMatch[1].trim()
        continue
      }

      const priorityMatch = trimmed.match(/^priority:\s*(\d)$/)
      if (priorityMatch) {
        ticket.priority = Number.parseInt(priorityMatch[1], 10)
        continue
      }

      const typeMatch = trimmed.match(/^type:\s*(.+)$/)
      if (typeMatch) {
        ticket.type = typeMatch[1].trim()
        continue
      }

      const createdMatch = trimmed.match(/^created:\s*(.+)$/)
      if (createdMatch) {
        ticket.created = createdMatch[1].trim()
        continue
      }

      const assigneeMatch = trimmed.match(/^assignee:\s*(.+)$/)
      if (assigneeMatch) {
        ticket.assignee = assigneeMatch[1].trim()
        continue
      }

      const depsMatch = trimmed.match(/^deps:\s*\[(.*)\]$/)
      if (depsMatch) {
        const depsStr = depsMatch[1].trim()
        if (depsStr.length > 0) {
          ticket.dependencies = depsStr
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d.length > 0)
        }
        continue
      }
      continue
    }

    // After frontmatter, parse title from # heading
    if (foundFrontmatterEnd) {
      const titleMatch = trimmed.match(/^#\s+(.+)$/)
      if (titleMatch && !ticket.title) {
        ticket.title = titleMatch[1].trim()
        continue
      }
    }
  }

  if (!ticket.id) {
    throw new Error("Failed to parse ticket: missing ID")
  }

  if (!ticket.title) {
    throw new Error("Failed to parse ticket: missing title")
  }

  return ticket as Ticket
}

interface TkQueryResult {
  id: string
  status: string
  deps: string[]
  links: string[]
  created: string
  type: string
  priority: string | number
  assignee?: string
  title?: string
}

function parseTicketsFromJsonLines(output: string): Ticket[] {
  const tickets: Ticket[] = []
  const lines = output.split("\n").filter((l) => l.trim().length > 0)

  for (const line of lines) {
    try {
      const json = JSON.parse(line) as TkQueryResult
      tickets.push({
        id: json.id,
        title: json.title || json.id, // tk query doesn't include title, use id as fallback
        status: json.status,
        priority: typeof json.priority === "string" ? Number.parseInt(json.priority, 10) : json.priority,
        dependencies: json.deps || [],
        created: json.created,
        type: json.type,
        assignee: json.assignee,
      })
    } catch {
      continue
    }
  }

  return tickets
}

export async function getReadyTickets(): Promise<Ticket[]> {
  try {
    const result = await execTk(["query"])
    if (result.exitCode !== 0) {
      throw new Error(`tk query failed: ${result.stderr}`)
    }

    const allTickets = parseTicketsFromJsonLines(result.stdout)
    // Ready = open/in_progress with NO unresolved dependencies
    return allTickets.filter((t) => {
      if (t.status === "closed") return false
      if (t.dependencies.length === 0) return true
      // All dependencies must be closed for ticket to be ready
      const hasOpenDeps = allTickets.some(
        (dep) => t.dependencies.includes(dep.id) && dep.status !== "closed"
      )
      return !hasOpenDeps
    })
  } catch (e) {
    throw new Error(`Failed to get ready tickets: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function listTickets(options: ListOptions = {}): Promise<Ticket[]> {
  try {
    const result = await execTk(["query"])
    if (result.exitCode !== 0) {
      throw new Error(`tk query failed: ${result.stderr}`)
    }

    const tickets = parseTicketsFromJsonLines(result.stdout)

    return tickets.filter((t) => {
      if (options.status && t.status !== options.status) return false
      if (options.priority !== undefined && t.priority !== options.priority) return false
      if (options.type && t.type !== options.type) return false
      if (options.search && !t.title.includes(options.search)) return false
      return true
    })
  } catch (e) {
    throw new Error(`Failed to list tickets: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function showTicket(id: string): Promise<Ticket> {
  try {
    const result = await execTk(["show", id])
    if (result.exitCode !== 0) {
      throw new Error(`tk show failed: ${result.stderr}`)
    }

    return parseTicketFromMarkdown(result.stdout)
  } catch (e) {
    throw new Error(`Failed to show ticket: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function createTicket(
  title: string,
  options: Omit<CreateOptions, "title"> = Object.create(null)
): Promise<Ticket> {
  const args = ["create", title]

  if (options.type) {
    args.push("--type", options.type)
  }

  if (options.priority !== undefined) {
    args.push("--priority", String(options.priority))
  }

  if (options.description) {
    args.push("--description", options.description)
  }

  if (options.status) {
    args.push("--status", options.status)
  }

  try {
    const result = await execTk(args)
    if (result.exitCode !== 0) {
      throw new Error(`tk create failed: ${result.stderr}`)
    }

    // tk create just returns the ID, fetch full ticket
    const ticketId = result.stdout.trim()
    return showTicket(ticketId)
  } catch (e) {
    throw new Error(`Failed to create ticket: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function startTicket(id: string): Promise<string> {
  try {
    const result = await execTk(["start", id])
    if (result.exitCode !== 0) {
      throw new Error(`tk start failed: ${result.stderr}`)
    }

    return result.stdout.trim()
  } catch (e) {
    throw new Error(`Failed to start ticket: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function closeTicket(id: string, reason = "completed"): Promise<string> {
  try {
    const result = await execTk(["close", id, "--reason", reason])
    if (result.exitCode !== 0) {
      throw new Error(`tk close failed: ${result.stderr}`)
    }

    return result.stdout.trim()
  } catch (e) {
    throw new Error(`Failed to close ticket: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function addNote(id: string, note: string): Promise<string> {
  try {
    const result = await execTk(["add-note", id, "--note", note])
    if (result.exitCode !== 0) {
      throw new Error(`tk add-note failed: ${result.stderr}`)
    }

    return result.stdout.trim()
  } catch (e) {
    throw new Error(`Failed to add note: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function addDependency(from: string, to: string): Promise<string> {
  try {
    const result = await execTk(["dep", from, to])
    if (result.exitCode !== 0) {
      throw new Error(`tk dep failed: ${result.stderr}`)
    }

    return result.stdout.trim()
  } catch (e) {
    throw new Error(`Failed to add dependency: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function removeDependency(from: string, to: string): Promise<string> {
  try {
    const result = await execTk(["undep", from, to])
    if (result.exitCode !== 0) {
      throw new Error(`tk undep failed: ${result.stderr}`)
    }

    return result.stdout.trim()
  } catch (e) {
    throw new Error(`Failed to remove dependency: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function getBlockedTickets(): Promise<Ticket[]> {
  try {
    const result = await execTk(["query"])
    if (result.exitCode !== 0) {
      throw new Error(`tk query failed: ${result.stderr}`)
    }

    const allTickets = parseTicketsFromJsonLines(result.stdout)

    return allTickets.filter((t) => {
      if (t.status === "closed") return false
      if (t.dependencies.length === 0) return false
      return !allTickets.some(
        (dep) => t.dependencies.includes(dep.id) && dep.status !== "closed"
      )
    })
  } catch (e) {
    throw new Error(`Failed to get blocked tickets: ${e instanceof Error ? e.message : String(e)}`)
  }
}
