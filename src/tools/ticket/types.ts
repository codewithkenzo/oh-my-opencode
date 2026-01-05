export type OutputFormat = "markdown" | "json" | "compact"

export interface Ticket {
  id: string
  title: string
  status: string
  priority: number
  type?: string
  description?: string
  dependencies: string[]
  created: string
  assignee?: string
}

export interface CreateOptions {
  title: string
  type?: string
  priority?: number
  description?: string
  status?: string
}

export interface ListOptions {
  status?: string
  priority?: number
  type?: string
  search?: string
}
